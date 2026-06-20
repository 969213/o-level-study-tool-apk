import os
import json
import re

def parse_study_material(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return []

    questions = []
    current_subject = "General"
    current_topic = "General"
    
    current_q = None
    
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        # Parse Subject
        subject_match = re.match(r"^===\s*SUBJECT:\s*(.*?)\s*===$", line_str, re.IGNORECASE)
        if subject_match:
            current_subject = subject_match.group(1)
            continue
            
        # Parse Topic
        topic_match = re.match(r"^===\s*TOPIC:\s*(.*?)\s*===$", line_str, re.IGNORECASE)
        if topic_match:
            current_topic = topic_match.group(1)
            continue
            
        # Parse Question
        if line_str.startswith("Q:"):
            if current_q:
                questions.append(current_q)
            current_q = {
                "subject": current_subject,
                "topic": current_topic,
                "question": line_str[2:].strip(),
                "options": {},
                "correct": "",
                "explanation": ""
            }
            continue
            
        # Parse Options
        option_match = re.match(r"^([A-D])\)\s*(.*)$", line_str)
        if option_match and current_q:
            opt_letter = option_match.group(1)
            opt_val = option_match.group(2).strip()
            current_q["options"][opt_letter] = opt_val
            continue
            
        # Parse Correct Answer
        correct_match = re.match(r"^CORRECT:\s*([A-D])$", line_str, re.IGNORECASE)
        if correct_match and current_q:
            current_q["correct"] = correct_match.group(1).upper()
            continue
            
        # Parse Explanation
        explanation_match = re.match(r"^EXPLANATION:\s*(.*)$", line_str, re.IGNORECASE)
        if explanation_match and current_q:
            current_q["explanation"] = explanation_match.group(1).strip()
            continue
            
        # If explanation spans multiple lines
        if current_q and current_q["explanation"] and not line_str.startswith("Q:") and not option_match and not correct_match:
            current_q["explanation"] += " " + line_str
            
    # Append the last question
    if current_q:
        questions.append(current_q)
        
    return questions

def main():
    input_file = "study_material.txt"
    output_file = "questions.json"
    
    print(f"Parsing {input_file}...")
    questions = parse_study_material(input_file)
    
    if questions:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=4)
        print(f"Successfully generated {output_file} with {len(questions)} questions.")
    else:
        print("No questions found or parsing failed.")

if __name__ == "__main__":
    main()
