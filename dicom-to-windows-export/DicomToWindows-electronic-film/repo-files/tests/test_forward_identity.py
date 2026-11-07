"""Tests for the identity a forwarded print film carries.

Why these exist: a film printed by the X-ray console reached PACS as Modality OT
with StudyDescription "Print Job dicom:...", and the ERP's bill matcher refuses any
candidate whose modality contradicts the bill - so every one of those films was
unlinkable from its bill no matter how well the patient name read. These tests pin
the three things that changed: the modality decision, the exam name read off the
film, and refusing to send a blank instead of shipping an empty study.

Run from repo-files/:  python3 -m unittest tests.test_forward_identity -v

numpy/cv2 are stubbed only when they are genuinely absent (this file has to run on a
machine that has neither so the bridge can be tested before it is installed).
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path


def _stub_missing_image_libraries() -> None:
    if importlib.util.find_spec("numpy") is None:
        numpy = types.ModuleType("numpy")

        class _FakeArray:
            def __init__(self, image):
                self._bytes = image.tobytes()
                self.size = len(self._bytes)

            def tobytes(self):
                return self._bytes

        numpy.array = lambda image: _FakeArray(image)
        numpy.ndarray = _FakeArray
        numpy.uint8 = int
        sys.modules["numpy"] = numpy
    if importlib.util.find_spec("cv2") is None:
        cv2 = types.ModuleType("cv2")
        for name in ("imread", "cvtColor", "resize", "createCLAHE", "GaussianBlur",
                     "COLOR_BGR2RGB", "COLOR_RGB2GRAY", "INTER_AREA", "INTER_LINEAR"):
            setattr(cv2, name, lambda *a, **k: None)
        sys.modules["cv2"] = cv2


_stub_missing_image_libraries()
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import server  # noqa: E402
from server import PatientInfo  # noqa: E402


def _keywords(text: str) -> set[str]:
    """The ERP matcher's own rule: whitespace-split, words longer than 2 chars."""
    return {w for w in str(text or "").lower().split() if len(w) > 2}


class StudyDescriptionExtractionTests(unittest.TestCase):
    """The exam name is read off the film because the console never sends it."""

    def test_body_part_and_view_from_a_console_header(self):
        text = "CARE DIAGNOSTICS, DEOGHAR\nSELFTEST SURNAME 45Y\nCERVICAL SPINE AP/LAT\nDR. SURNAME"
        self.assertEqual(server.extract_study_description_from_ocr(text), "CERVICAL SPINE AP/LAT")

    def test_lowercase_ocr_output_still_matches(self):
        self.assertEqual(
            server.extract_study_description_from_ocr("chest x-ray pa view"), "CHEST PA"
        )

    def test_two_word_phrase_wins_over_the_word_nested_in_it(self):
        self.assertEqual(
            server.extract_study_description_from_ocr("XRAY LS SPINE AP/LAT"), "LS SPINE AP/LAT"
        )

    def test_word_boundaries_keep_unrelated_words_from_becoming_an_exam(self):
        # "HIP" inside "SHIP", "AP" inside "HAPPY", "PA" inside "PAPER": none are exams.
        self.assertEqual(server.extract_study_description_from_ocr("PATIENT SHIPPED HAPPY PAPER"), "")

    def test_nothing_is_invented_when_the_film_names_no_exam(self):
        self.assertEqual(server.extract_study_description_from_ocr("CARE DIAGNOSTICS  DEOGHAR"), "")
        self.assertEqual(server.extract_study_description_from_ocr(""), "")
        self.assertEqual(server.extract_study_description_from_ocr(None), "")

    def test_two_parts_and_a_view_is_the_ceiling(self):
        out = server.extract_study_description_from_ocr("CHEST KUB SKULL AP LAT OBL")
        self.assertLessEqual(len(out), 64)
        self.assertEqual(out.split()[0], "CHEST")
        self.assertLessEqual(len(out.split()) , 5)

    def test_the_words_are_the_ones_the_erp_scores_against_test_names(self):
        # matchingEngine.ts rule 5 overlaps description words longer than two
        # characters with the billed test name, so a description sharing no word
        # with it buys nothing. These are CARE's own X-ray test names, measured
        # from radiology_studies joined to diagnostic_tests on 2026-11-07.
        cases = (
            ("CERVICAL SPINE AP", "X-RAY CERVICAL SPINE AP/LAT"),
            ("LS SPINE LAT", "XRAY LS SPINE AP/LAT"),
            ("CHEST PA", "CHEST X-RAY"),
            ("KUB AP", "X-RAY KUB"),
            ("OPG PANORAMIC", "OPG PAN VIEW (Orthopantomogram)"),
        )
        for film, billed_test_name in cases:
            desc = server.extract_study_description_from_ocr(f"CARE DIAGNOSTICS {film} SELFTEST SURNAME")
            overlap = _keywords(desc) & _keywords(billed_test_name)
            self.assertTrue(
                overlap,
                f"film naming {film!r} extracted {desc!r}, which shares no keyword with "
                f"the billed test {billed_test_name!r}",
            )


class ModalityResolutionTests(unittest.TestCase):
    def setUp(self):
        self._modality = server.PRINT_FORWARD_MODALITY
        self._aets = server.PRINT_FORWARD_MODALITY_AETS

    def tearDown(self):
        server.PRINT_FORWARD_MODALITY = self._modality
        server.PRINT_FORWARD_MODALITY_AETS = self._aets

    def test_unconfigured_behaviour_is_unchanged(self):
        server.PRINT_FORWARD_MODALITY = ""
        server.PRINT_FORWARD_MODALITY_AETS = "FILMPLUS"
        self.assertEqual(server.resolve_print_forward_modality("", "FILMPLUS"), "OT")

    def test_configured_modality_applies_only_to_the_named_calling_ae(self):
        server.PRINT_FORWARD_MODALITY = "CR"
        server.PRINT_FORWARD_MODALITY_AETS = "FILMPLUS, XRAYPRINT"
        self.assertEqual(server.resolve_print_forward_modality("", "FILMPLUS"), "CR")
        self.assertEqual(server.resolve_print_forward_modality("", "filmplus"), "CR")
        self.assertEqual(server.resolve_print_forward_modality("", "VOLUSON"), "OT")

    def test_a_configured_modality_with_no_ae_list_relabels_nothing(self):
        server.PRINT_FORWARD_MODALITY = "CR"
        server.PRINT_FORWARD_MODALITY_AETS = ""
        self.assertEqual(server.resolve_print_forward_modality("", "FILMPLUS"), "OT")

    def test_a_modality_the_job_really_did_send_always_wins(self):
        server.PRINT_FORWARD_MODALITY = "CR"
        server.PRINT_FORWARD_MODALITY_AETS = "FILMPLUS"
        self.assertEqual(server.resolve_print_forward_modality("US", "FILMPLUS"), "US")
        # Placeholders are not a modality the department chose.
        self.assertEqual(server.resolve_print_forward_modality("UNKNOWN", "FILMPLUS"), "CR")

    def test_the_sonographers_film_is_never_moved_into_the_xray_queue(self):
        server.PRINT_FORWARD_MODALITY = "CR"
        server.PRINT_FORWARD_MODALITY_AETS = "FILMPLUS"
        self.assertEqual(server.resolve_print_forward_modality("", "GE-VOLUSON-E9"), "OT")


class _RecordingJobStore:
    def __init__(self):
        self.updates = []

    def update_job(self, job_key, **fields):
        self.updates.append((job_key, fields))
        return {"jobKey": job_key, **fields}

    def last(self):
        return self.updates[-1][1] if self.updates else {}


class _FakeAssociation:
    def __init__(self, owner, established=True, status=0x0000):
        self.is_established = established
        self._owner = owner
        self._status = status

    def send_c_store(self, dataset):
        self._owner.stored.append(dataset)
        return types.SimpleNamespace(Status=self._status)

    def release(self):
        pass


class _FakeAE:
    established = True
    status = 0x0000
    stored = []

    def __init__(self, ae_title):
        type(self).associated_as = ae_title

    def add_requested_context(self, *a, **k):
        pass

    def associate(self, host, port, ae_title=None):
        type(self).target = (host, port, ae_title)
        return _FakeAssociation(self, type(self).established, type(self).status)


class ForwardRefusalTests(unittest.TestCase):
    """Nothing may reach PACS as an empty study wearing a patient's name."""

    def setUp(self):
        import pynetdicom

        self._pynet = pynetdicom
        self._real_ae = pynetdicom.AE
        pynetdicom.AE = _FakeAE
        _FakeAE.stored = []
        _FakeAE.established = True
        _FakeAE.status = 0x0000

        self._flags = (server.FORWARD_TO_ORTHANC, server.PRINT_FORWARD_MODALITY,
                       server.PRINT_FORWARD_MODALITY_AETS, server.job_store)
        server.FORWARD_TO_ORTHANC = True
        server.PRINT_FORWARD_MODALITY = "CR"
        server.PRINT_FORWARD_MODALITY_AETS = "FILMPLUS"
        self.jobs = _RecordingJobStore()
        server.job_store = self.jobs
        self.tmp = Path(tempfile.mkdtemp(prefix="forward-test-"))

    def tearDown(self):
        self._pynet.AE = self._real_ae
        (server.FORWARD_TO_ORTHANC, server.PRINT_FORWARD_MODALITY,
         server.PRINT_FORWARD_MODALITY_AETS, server.job_store) = self._flags

    def _forward(self, pages):
        info = PatientInfo(name="SELFTEST SURNAME", study_description="CHEST PA")
        server._forward_print_job_to_orthanc(
            job_key="test-job", patient_info=info, modality="",
            film_session_uid="1.2.3", source_calling_ae="FILMPLUS", out_paths=pages,
        )

    def _page(self, width, height):
        from PIL import Image
        path = self.tmp / f"page-{width}x{height}.png"
        Image.new("L", (width, height), 128).save(path)
        return path

    def test_a_missing_rendered_page_is_refused_not_sent_blank(self):
        self._forward([self.tmp / "never-written.png"])
        self.assertEqual(_FakeAE.stored, [])
        self.assertEqual(self.jobs.last().get("orthancForwardStatus"), "refused")

    def test_no_page_at_all_is_refused(self):
        self._forward([])
        self.assertEqual(_FakeAE.stored, [])
        self.assertEqual(self.jobs.last().get("orthancForwardStatus"), "refused")

    def test_a_degenerate_page_is_refused(self):
        self._forward([self._page(4, 4)])
        self.assertEqual(_FakeAE.stored, [])
        self.assertEqual(self.jobs.last().get("orthancForwardStatus"), "refused")

    def test_a_real_film_is_forwarded_with_the_bill_matcher_s_keys(self):
        page = self._page(120, 100)
        self._forward([page])
        self.assertEqual(len(_FakeAE.stored), 1)
        ds = _FakeAE.stored[0]
        self.assertEqual(str(ds.Modality), "CR")
        self.assertIn("CHEST", str(ds.StudyDescription))
        self.assertIn("PA", str(ds.StudyDescription))
        self.assertEqual((int(ds.Rows), int(ds.Columns)), (100, 120))
        self.assertGreater(len(ds.PixelData), 1000)
        self.assertEqual(self.jobs.last().get("orthancForwardStatus"), "sent")

    def test_a_rejected_c_store_is_recorded_as_failed(self):
        _FakeAE.status = 0xA770
        self._forward([self._page(120, 100)])
        self.assertEqual(self.jobs.last().get("orthancForwardStatus"), "failed")

    def test_a_failed_association_is_recorded_as_failed(self):
        _FakeAE.established = False
        self._forward([self._page(120, 100)])
        self.assertEqual(self.jobs.last().get("orthancForwardStatus"), "failed")
        self.assertEqual(_FakeAE.stored, [])


class PatientInfoEnrichmentTests(unittest.TestCase):
    def test_merged_with_carries_the_exam_forward(self):
        base = PatientInfo(name="SELFTEST SURNAME")
        merged = base.merged_with(PatientInfo(study_description="KUB"))
        self.assertEqual(merged.study_description, "KUB")
        self.assertEqual(merged.name, "SELFTEST SURNAME")

    def test_the_exam_never_changes_the_printed_patient_line(self):
        # The film a technician hands the patient must not change with this fix.
        with_exam = PatientInfo(name="SELFTEST SURNAME", patient_id="SELFTEST9",
                               study_description="CERVICAL SPINE AP")
        without = PatientInfo(name="SELFTEST SURNAME", patient_id="SELFTEST9")
        self.assertEqual(with_exam.label(), without.label())


if __name__ == "__main__":
    unittest.main()
