import os
import json
import re

def generate_members_json():
    """
    Scans the 'server/uploads/member_logos_circular' directory and generates a JSON file
    with member data based on the image filenames.
    """
    input_dir = 'server/uploads/member_logos_circular'
    output_file = 'public/data/members_generated.json'
    
    members = []
    member_id = 1
    
    if not os.path.exists(input_dir):
        print(f"Directory not found: {input_dir}")
        return

    # Sort files for a consistent order
    files = sorted(os.listdir(input_dir))

    for filename in files:
        if filename.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')):
            # Remove file extension
            name = os.path.splitext(filename)[0]
            
            # Remove potential hash at the end (e.g., _xxxxxx)
            name = re.sub(r'_.*$', '', name)
            
            # Create the logo path
            logo_path = f"/uploads/member_logos_circular/{filename}"
            
            members.append({
                "id": member_id,
                "name": name + "东方同好会",
                "logo": logo_path,
                "link": ""
            })
            
            member_id += 1
            
    # Write to JSON file
    output_dir = os.path.dirname(output_file)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(members, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully generated {output_file} with {len(members)} members.")

if __name__ == "__main__":
    generate_members_json()
