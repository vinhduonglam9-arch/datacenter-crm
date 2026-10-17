"""
Self-contained OCR engine script using RapidOCR.
Can be invoked from Node.js child_process or directly as an HTTP service / CLI.
Input: image file path or base64 data passed via stdin/argument.
Output: detected text lines and concatenated text in JSON format.
"""
import sys
import json
import base64
import os
import io

def get_ocr_engine(det_model=None, rec_model=None, cls_model=None):
    from rapidocr_onnxruntime import RapidOCR
    params = {}
    if det_model and os.path.exists(det_model):
        params['det_model_path'] = det_model
    if rec_model and os.path.exists(rec_model):
        params['rec_model_path'] = rec_model
    if cls_model and os.path.exists(cls_model):
        params['cls_model_path'] = cls_model
    return RapidOCR(**params)

def run_ocr_on_bytes(image_bytes, det_model=None, rec_model=None, cls_model=None):
    ocr = get_ocr_engine(det_model, rec_model, cls_model)
    result, elapse_list = ocr(image_bytes)
    
    if not result:
        return {
            "success": True,
            "raw_text": "",
            "lines": []
        }
    
    lines = []
    text_pieces = []
    for item in result:
        # item: [box, text, score]
        box, text, score = item[0], item[1], float(item[2])
        lines.append({
            "text": text,
            "score": round(score, 4),
            "box": box
        })
        text_pieces.append(text)
        
    return {
        "success": True,
        "raw_text": "\n".join(text_pieces),
        "lines": lines
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print(json.dumps({"status": "ready"}))
        sys.exit(0)

    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "No input provided on stdin"}))
            sys.exit(1)
            
        payload = json.loads(input_data)
        image_base64 = payload.get("imageBase64", "")
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
            
        det_m = payload.get("detModel")
        rec_m = payload.get("recModel")
        cls_m = payload.get("clsModel")
        
        img_bytes = base64.b64decode(image_base64)
        output = run_ocr_on_bytes(img_bytes, det_m, rec_m, cls_m)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
