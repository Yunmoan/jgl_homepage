import os
import sys
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- 配置 ---
TARGET_DIR = 'public/member_logos_circular' # 要处理的图片目录
MAX_SIZE_KB = 100  # 目标最大文件大小 (KB)
TARGET_QUALITY = 80 # 初始压缩质量
# -----------

def compress_image(file_path, max_size_bytes):
    """压缩单个图片文件"""
    try:
        initial_size = os.path.getsize(file_path)
        if initial_size <= max_size_bytes:
            return f'跳过 (大小已满足): {os.path.basename(file_path)}'

        img = Image.open(file_path).convert('RGB')
        
        # 尝试使用设定的质量进行压缩
        img.save(file_path, 'webp', quality=TARGET_QUALITY)
        
        final_size = os.path.getsize(file_path)
        
        size_diff = initial_size - final_size
        return f'成功: {os.path.basename(file_path)} | {initial_size / 1024:.2f}KB -> {final_size / 1024:.2f}KB | 节省: {size_diff / 1024:.2f}KB'

    except Exception as e:
        return f'失败: {os.path.basename(file_path)} | 错误: {e}'

def main():
    """主函数"""
    if not os.path.isdir(TARGET_DIR):
        print(f'错误: 目录不存在 -> {TARGET_DIR}')
        sys.exit(1)

    max_size_bytes = MAX_SIZE_KB * 1024
    
    # 找出所有webp文件
    webp_files = [
        os.path.join(TARGET_DIR, f) 
        for f in os.listdir(TARGET_DIR) 
        if f.lower().endswith('.webp') and os.path.getsize(os.path.join(TARGET_DIR, f)) > max_size_bytes
    ]

    if not webp_files:
        print('没有找到大于 100KB 的 WebP 文件需要压缩。')
        return

    print(f'找到 {len(webp_files)} 个大于 {MAX_SIZE_KB}KB 的 WebP 文件，开始压缩...')

    # 使用线程池并发处理
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(compress_image, file_path, max_size_bytes) for file_path in webp_files]
        
        for future in as_completed(futures):
            print(future.result())

if __name__ == '__main__':
    main()
