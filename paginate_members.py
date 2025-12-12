import os
import json

# --- 配置 ---
INPUT_FILE = 'public/data/members_generated.json'
OUTPUT_DIR = 'public/data/members_paginated'
MEMBERS_PER_PAGE = 18
# -----------

def paginate_members():
    """将成员数据JSON文件拆分为多个分页文件"""
    try:
        # 确保输出目录存在
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        # 读取源文件
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            all_members = json.load(f)

        # 计算总页数
        total_members = len(all_members)
        total_pages = (total_members + MEMBERS_PER_PAGE - 1) // MEMBERS_PER_PAGE

        # 创建分页文件
        for i in range(total_pages):
            start_index = i * MEMBERS_PER_PAGE
            end_index = start_index + MEMBERS_PER_PAGE
            page_data = all_members[start_index:end_index]
            
            output_filename = os.path.join(OUTPUT_DIR, f'members_page_{i + 1}.json')
            with open(output_filename, 'w', encoding='utf-8') as f_out:
                json.dump(page_data, f_out, ensure_ascii=False, indent=2)
            print(f'已创建: {output_filename}')

        # 创建元数据文件
        metadata = {
            'totalMembers': total_members,
            'totalPages': total_pages,
            'membersPerPage': MEMBERS_PER_PAGE
        }
        metadata_filename = os.path.join(OUTPUT_DIR, 'metadata.json')
        with open(metadata_filename, 'w', encoding='utf-8') as f_meta:
            json.dump(metadata, f_meta, ensure_ascii=False, indent=2)
        print(f'已创建元数据文件: {metadata_filename}')
        
        print(f'\n成功将 {total_members} 个成员拆分为 {total_pages} 个分页文件。')

    except FileNotFoundError:
        print(f'错误: 输入文件未找到 -> {INPUT_FILE}')
    except Exception as e:
        print(f'处理过程中发生错误: {e}')

if __name__ == '__main__':
    paginate_members()

