import os
from PIL import Image, ImageDraw

def create_circular_image(image_path, output_path):
    """
    Crops an image into a circle and saves it with a transparent background.
    """
    try:
        img = Image.open(image_path).convert("RGB")
        
        # Create a mask
        size = (min(img.size),) * 2
        mask = Image.new('L', size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0) + size, fill=255)
        
        # Apply mask
        output_img = Image.new('RGBA', size, (255, 255, 255, 0))
        
        # Center the crop
        left = (img.width - size[0]) // 2
        top = (img.height - size[1]) // 2
        right = left + size[0]
        bottom = top + size[1]
        
        cropped_img = img.crop((left, top, right, bottom))
        
        output_img.paste(cropped_img, (0, 0), mask)
        output_img.save(output_path, "PNG")
        print(f"Processed {image_path} -> {output_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def main():
    input_dir = './'
    output_dir = 'public/member_logos_circular'

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename in os.listdir(input_dir):
        if filename.lower().endswith('.jpg'):
            image_path = os.path.join(input_dir, filename)
            output_filename = os.path.splitext(filename)[0] + '.png'
            output_path = os.path.join(output_dir, output_filename)
            create_circular_image(image_path, output_path)

if __name__ == "__main__":
    main()

