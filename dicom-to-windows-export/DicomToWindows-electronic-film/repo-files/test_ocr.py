r"""Test OCR extraction on existing film PDFs.

Run this AFTER installing Tesseract OCR from:
C:\Users\abina\Desktop\tesseract-ocr-w64-setup-5.4.0.20240606.exe

Usage:
    python test_ocr.py
"""
import sys
from pathlib import Path

# Add DicomViewer to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

import pymupdf
from PIL import Image
import io

def test_ocr_on_pdf(pdf_path: Path):
    """Test OCR extraction on a single PDF."""
    print(f"\n{'='*60}")
    print(f"Testing: {pdf_path.name}")
    print(f"{'='*60}")

    # Convert PDF to image
    doc = pymupdf.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(200/72, 200/72))
    img_data = pix.tobytes("png")

    # Save temporarily
    temp_img = Path("C:/Users/abina/Desktop/test_film_temp.png")
    with open(temp_img, "wb") as f:
        f.write(img_data)

    print(f"Converted to image: {pix.width}x{pix.height}")

    # Test OCR
    try:
        from server import _extract_patient_info_via_ocr
        result = _extract_patient_info_via_ocr(temp_img)

        print(f"\nOCR Results:")
        print(f"  Patient Name: {result['patient_name'] or '(not found)'}")
        print(f"  Referring Doctor: {result['referring_doctor'] or '(not found)'}")

        # Also show raw OCR text for debugging
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        img = Image.open(temp_img)
        raw_text = pytesseract.image_to_string(img)

        print(f"\nRaw OCR Text (first 500 chars):")
        print(raw_text[:500])

    except Exception as exc:
        print(f"\nOCR failed: {exc}")
        print("\nTroubleshooting:")
        print("1. Make sure Tesseract is installed at C:\\Program Files\\Tesseract-OCR")
        print("2. Run the installer: C:\\Users\\abina\\Desktop\\tesseract-ocr-w64-setup-5.4.0.20240606.exe")
        print("3. During installation, select 'English' language data")

    finally:
        doc.close()
        if temp_img.exists():
            temp_img.unlink()

def main():
    """Test OCR on recent film PDFs."""
    print_dir = Path("C:/Users/abina/AppData/Local/DicomViewer/print-jobs")
    pdfs = sorted(print_dir.glob("print_*.pdf"), reverse=True)

    if not pdfs:
        print("No PDF files found in print-jobs directory")
        return

    print(f"Found {len(pdfs)} film PDFs")
    print(f"Testing OCR on the 3 most recent...")

    for pdf in pdfs[:3]:
        test_ocr_on_pdf(pdf)

    print(f"\n{'='*60}")
    print("Test complete!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
