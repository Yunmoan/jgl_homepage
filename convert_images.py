import os
from PIL import Image
import argparse

def convert_png_to_webp(source_dir, quality=80, delete_originals=False):
    """
    Recursively finds all PNG images in a directory and converts them to WebP format.

    :param source_dir: The source directory to search for PNG files.
    :param quality: The quality of the output WebP image (0-100).
    :param delete_originals: Whether to delete the original PNG file after conversion.
    """
    print(f"Searching for PNG files in: {source_dir}")
    print(f"Conversion quality set to: {quality}")
    if delete_originals:
        print("Original PNG files will be deleted after conversion.")

    converted_count = 0
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.lower().endswith('.png'):
                png_path = os.path.join(root, file)
                webp_path = os.path.splitext(png_path)[0] + '.webp'

                try:
                    with Image.open(png_path) as img:
                        img.save(webp_path, 'webp', quality=quality)
                    print(f"Converted: {png_path} -> {webp_path}")
                    converted_count += 1

                    if delete_originals:
                        os.remove(png_path)
                        print(f"Deleted original: {png_path}")

                except Exception as e:
                    print(f"Error converting {png_path}: {e}")

    print(f"\nConversion complete. Total files converted: {converted_count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PNG images to WebP format.")
    parser.add_argument("directory", type=str, help="The directory to search for PNG files.")
    parser.add_argument("-q", "--quality", type=int, default=80, help="WebP quality (0-100), default is 80.")
    parser.add_argument("-d", "--delete", action="store_true", help="Delete original PNG files after conversion.")

    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"Error: Directory not found at '{args.directory}'")
    else:
        convert_png_to_webp(args.directory, args.quality, args.delete)

