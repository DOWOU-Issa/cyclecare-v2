from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import shutil
import tempfile
import unicodedata

from lxml import etree


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
W = NS["w"]


INPUT = Path(r"C:\Users\hp\Downloads\cours cdp\IA B3\semestre 2\MEMOIRE\memoire fis\Redaction retenu\MEMOIRE_DOWOU_Issa_B3IABD_mis_a_jour.docx")
OUTPUT = INPUT.with_name("MEMOIRE_DOWOU_Issa_B3IABD_mis_a_jour_pages_titres.docx")


TITLE_PAGES = [
    {
        "find": "INTRODUCTION GENERALE",
        "display": "INTRODUCTION GÉNÉRALE",
        "width": 4700,
        "no_break_before": True,
    },
    {
        "find": "CHAPITRE 1 : CADRE THEORIQUE ET ETAT DE L'ART",
        "display": "CHAPITRE 1 : CADRE THÉORIQUE ET ÉTAT DE L'ART",
        "width": 6100,
    },
    {
        "find": "CHAPITRE 2 : METHODOLOGIE DE L'ETUDE",
        "display": "CHAPITRE 2 : MÉTHODOLOGIE DE L'ÉTUDE",
        "width": 5600,
    },
    {
        "find": "CHAPITRE 3 : PRESENTATION DE LA SITUATION (PRESENTATION DES DONNEES COLLECTEES / DES RESULTATS)",
        "display": "CHAPITRE 3 : PRÉSENTATION DE LA SITUATION\n(PRÉSENTATION DES DONNÉES COLLECTÉES / DES RÉSULTATS)",
        "width": 7200,
    },
    {
        "find": "CHAPITRE 4 : CONCEPTION, IMPLEMENTATION ET EVALUATION DU PROTOTYPE",
        "display": "CHAPITRE 4 : CONCEPTION, IMPLÉMENTATION ET\nÉVALUATION DU PROTOTYPE",
        "width": 6700,
    },
    {
        "find": "CONCLUSION GENERALE",
        "display": "CONCLUSION GÉNÉRALE",
        "width": 4800,
    },
]


def qn(name: str) -> str:
    prefix, local = name.split(":")
    return f"{{{NS[prefix]}}}{local}"


def normalize(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip().casefold()
    return "".join(
        char for char in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(char)
    )


def paragraph_text(el) -> str:
    return "".join(el.xpath(".//w:t/text()", namespaces=NS))


def body_and_children(doc):
    body = doc.find("w:body", NS)
    return body, [child for child in body if child.tag != qn("w:sectPr")]


def has_page_break(el) -> bool:
    return bool(el.xpath(".//w:br[@w:type='page']", namespaces=NS))


def is_break_only_para(el) -> bool:
    return el.tag == qn("w:p") and not normalize(paragraph_text(el)) and has_page_break(el)


def page_break_paragraph():
    p = etree.Element(qn("w:p"))
    r = etree.SubElement(p, qn("w:r"))
    br = etree.SubElement(r, qn("w:br"))
    br.set(qn("w:type"), "page")
    return p


def spacer_paragraph():
    p = etree.Element(qn("w:p"))
    p_pr = etree.SubElement(p, qn("w:pPr"))
    spacing = etree.SubElement(p_pr, qn("w:spacing"))
    spacing.set(qn("w:before"), "0")
    spacing.set(qn("w:after"), "0")
    spacing.set(qn("w:line"), "480")
    spacing.set(qn("w:lineRule"), "exact")
    r = etree.SubElement(p, qn("w:r"))
    r_pr = etree.SubElement(r, qn("w:rPr"))
    color = etree.SubElement(r_pr, qn("w:color"))
    color.set(qn("w:val"), "FFFFFF")
    size = etree.SubElement(r_pr, qn("w:sz"))
    size.set(qn("w:val"), "48")
    t = etree.SubElement(r, qn("w:t"))
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = " "
    return p


def spacer_paragraphs(count=8):
    return [spacer_paragraph() for _ in range(count)]


def title_table(text: str, width: int):
    tbl = etree.Element(qn("w:tbl"))
    tbl_pr = etree.SubElement(tbl, qn("w:tblPr"))

    tbl_w = etree.SubElement(tbl_pr, qn("w:tblW"))
    tbl_w.set(qn("w:w"), str(width))
    tbl_w.set(qn("w:type"), "dxa")

    jc = etree.SubElement(tbl_pr, qn("w:jc"))
    jc.set(qn("w:val"), "center")

    borders = etree.SubElement(tbl_pr, qn("w:tblBorders"))
    for side in ("top", "left", "bottom", "right"):
        border = etree.SubElement(borders, qn(f"w:{side}"))
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "12")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "F0A000")

    look = etree.SubElement(tbl_pr, qn("w:tblLook"))
    look.set(qn("w:val"), "04A0")

    grid = etree.SubElement(tbl, qn("w:tblGrid"))
    col = etree.SubElement(grid, qn("w:gridCol"))
    col.set(qn("w:w"), str(width))

    tr = etree.SubElement(tbl, qn("w:tr"))
    tc = etree.SubElement(tr, qn("w:tc"))
    tc_pr = etree.SubElement(tc, qn("w:tcPr"))
    tc_w = etree.SubElement(tc_pr, qn("w:tcW"))
    tc_w.set(qn("w:w"), str(width))
    tc_w.set(qn("w:type"), "dxa")

    margins = etree.SubElement(tc_pr, qn("w:tcMar"))
    for side, value in (("top", "260"), ("left", "260"), ("bottom", "260"), ("right", "260")):
        mar = etree.SubElement(margins, qn(f"w:{side}"))
        mar.set(qn("w:w"), value)
        mar.set(qn("w:type"), "dxa")

    v_align = etree.SubElement(tc_pr, qn("w:vAlign"))
    v_align.set(qn("w:val"), "center")

    p = etree.SubElement(tc, qn("w:p"))
    p_pr = etree.SubElement(p, qn("w:pPr"))
    p_jc = etree.SubElement(p_pr, qn("w:jc"))
    p_jc.set(qn("w:val"), "center")
    p_spacing = etree.SubElement(p_pr, qn("w:spacing"))
    p_spacing.set(qn("w:before"), "0")
    p_spacing.set(qn("w:after"), "0")

    lines = text.split("\n")
    for i, line in enumerate(lines):
        r = etree.SubElement(p, qn("w:r"))
        r_pr = etree.SubElement(r, qn("w:rPr"))
        etree.SubElement(r_pr, qn("w:b"))
        color = etree.SubElement(r_pr, qn("w:color"))
        color.set(qn("w:val"), "4F81BD")
        size = etree.SubElement(r_pr, qn("w:sz"))
        size.set(qn("w:val"), "22")
        size_cs = etree.SubElement(r_pr, qn("w:szCs"))
        size_cs.set(qn("w:val"), "22")
        t = etree.SubElement(r, qn("w:t"))
        t.text = line
        if i < len(lines) - 1:
            etree.SubElement(r, qn("w:br"))

    return tbl


def find_title_index(children, title: str):
    target = normalize(title)
    candidates = []
    for index, child in enumerate(children):
        if child.tag != qn("w:p"):
            continue
        text = normalize(paragraph_text(child))
        if text == target:
            candidates.append(index)

    if not candidates:
        raise ValueError(f"Title not found: {title}")

    # Skip front matter and generated tables; the real body headings occur later.
    return max(candidates)


def apply_title_page(body, children, spec):
    idx = find_title_index(children, spec["find"])
    title_el = children[idx]

    insert_at = body.index(title_el)
    replacement = [*spacer_paragraphs(), title_table(spec["display"], spec["width"]), page_break_paragraph()]

    if not spec.get("no_break_before") and (idx == 0 or not has_page_break(children[idx - 1])):
        replacement.insert(0, page_break_paragraph())

    body.remove(title_el)
    for offset, el in enumerate(replacement):
        body.insert(insert_at + offset, el)

    body, children = body_and_children(body.getparent())

    # Remove duplicate page-break-only paragraphs directly after the title-page block.
    end_idx = insert_at + len(replacement)
    while end_idx < len(children) and is_break_only_para(children[end_idx]):
        body.remove(children[end_idx])
        body, children = body_and_children(body.getparent())


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        with ZipFile(INPUT) as z:
            z.extractall(tmp)

        doc_path = tmp / "word" / "document.xml"
        doc = etree.parse(str(doc_path)).getroot()
        for spec in TITLE_PAGES:
            body, children = body_and_children(doc)
            apply_title_page(body, children, spec)

        etree.ElementTree(doc).write(str(doc_path), xml_declaration=True, encoding="UTF-8", standalone=True)

        if OUTPUT.exists():
            OUTPUT.unlink()
        with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as out:
            for file in tmp.rglob("*"):
                if file.is_file():
                    out.write(file, file.relative_to(tmp).as_posix())

    print(OUTPUT)


if __name__ == "__main__":
    main()
