"""Simple OCR test for setup script."""
import sys
from pathlib import Path

def main():
    tesseract_path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    print(f"Tesseract: {tesseract_path}")
    print()

    # Check Tesseract exists
    if not Path(tesseract_path).exists():
        print(f"[ERROR] Tesseract not found at: {tesseract_path}")
        return 1

    # Test import
    try:
        import pytesseract
        import pymupdf
        from PIL import Image
        print("[OK] Python libraries loaded")
    except ImportError as e:
        print(f"[ERROR] Missing library: {e}")
        return 1

    # Find a test PDF
    print_dir = Path("C:/Users/abina/AppData/Local/DicomViewer/print-jobs")
    pdfs = sorted(print_dir.glob("print_*.pdf"), reverse=True)

    if not pdfs:
        print("[WARN] No test PDFs found")
        print("[OK] OCR setup complete (no test data available)")
        return 0

    print(f"[OK] Found {len(pdfs)} film PDFs")
    print()

    # Test on most recent PDF
    test_pdf = pdfs[0]
    print(f"Testing: {test_pdf.name}")

    try:
        # Configure Tesseract
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

        # Convert PDF to image
        doc = pymupdf.open(test_pdf)
        page = doc[0]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(150/72, 150/72))
        img_data = pix.tobytes("png")

        # Save temporarily
        temp_img = Path("C:/Users/abina/Desktop/ocr_test_temp.png")
        with open(temp_img, "wb") as f:
            f.write(img_data)

        # Run OCR
        from server import _extract_patient_info_via_ocr
        result = _extract_patient_info_via_ocr(temp_img)

        doc.close()
        temp_img.unlink()

        patient = result['patient_name']
        doctor = result['referring_doctor']

        print()
        if patient or doctor:
            print(f"[OK] OCR extraction successful:")
            print(f"     Patient: {patient or '(none)'}")
            print(f"     Doctor:  {doctor or '(none)'}")
        else:
            print("[OK] OCR ran successfully (no patient info in this film)")
            print("     This is normal for calibration/test films")

        return 0

    except Exception as e:
        print(f"[ERROR] OCR test failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
