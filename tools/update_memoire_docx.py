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
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
W = NS["w"]
R = NS["r"]
REL = NS["rel"]


BASE = Path(r"C:\Users\hp\Downloads\cours cdp\IA B3\semestre 2\MEMOIRE\memoire fis\Redaction retenu\MEMOIRE_DOWOU_Issa_B3IABD.docx")
CH4 = Path(r"C:\Users\hp\Downloads\Chapitre_4_Conception_Implementation.docx")
BIB = Path(r"C:\Users\hp\Downloads\Bibliographie_Webographie.docx")
OUT = BASE.with_name("MEMOIRE_DOWOU_Issa_B3IABD_mis_a_jour.docx")


def normalize(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip().casefold()
    return "".join(
        char for char in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(char)
    )


def paragraph_text(el) -> str:
    return "".join(el.xpath(".//w:t/text()", namespaces=NS))


def body_children(doc_xml):
    body = doc_xml.find("w:body", NS)
    return body, [child for child in body if child.tag != f"{{{W}}}sectPr"]


def parse_xml(path: Path, member: str):
    with ZipFile(path) as z:
        return etree.fromstring(z.read(member))


def body_content(path: Path):
    doc = parse_xml(path, "word/document.xml")
    _, children = body_children(doc)
    return [deepcopy(child) for child in children]


def find_para_index(children, needle: str, *, start=0, exact=False):
    needle_n = normalize(needle)
    for i in range(start, len(children)):
        if children[i].tag != f"{{{W}}}p":
            continue
        text_n = normalize(paragraph_text(children[i]))
        if exact and text_n == needle_n:
            return i
        if not exact and needle_n in text_n:
            return i
    raise ValueError(f"Could not find paragraph containing: {needle}")


def next_rel_id(rels_root):
    max_id = 0
    for rel in rels_root.findall("rel:Relationship", NS):
        rid = rel.get("Id", "")
        if rid.startswith("rId") and rid[3:].isdigit():
            max_id = max(max_id, int(rid[3:]))
    while True:
        max_id += 1
        yield f"rId{max_id}"


def copy_related_parts(src_dir: Path, dst_dir: Path, inserted_elements):
    src_rels_path = src_dir / "word" / "_rels" / "document.xml.rels"
    dst_rels_path = dst_dir / "word" / "_rels" / "document.xml.rels"
    if not src_rels_path.exists():
        return

    src_rels = etree.parse(str(src_rels_path)).getroot()
    dst_rels = etree.parse(str(dst_rels_path)).getroot()
    rel_by_id = {rel.get("Id"): rel for rel in src_rels.findall("rel:Relationship", NS)}
    id_gen = next_rel_id(dst_rels)
    copied = {}

    referenced = set()
    for el in inserted_elements:
        for attr_value in el.xpath(".//@r:embed | .//@r:id | .//@r:link", namespaces=NS):
            referenced.add(attr_value)

    for old_id in sorted(referenced):
        rel = rel_by_id.get(old_id)
        if rel is None:
            continue
        rel_type = rel.get("Type", "")
        target = rel.get("Target", "")
        mode = rel.get("TargetMode")
        new_id = next(id_gen)
        copied[old_id] = new_id

        new_rel = deepcopy(rel)
        new_rel.set("Id", new_id)

        if mode != "External" and not target.startswith("/"):
            src_part = (src_dir / "word" / target).resolve()
            if src_part.exists():
                target_path = Path(target)
                dst_part = dst_dir / "word" / target_path
                if dst_part.exists():
                    stem = target_path.stem
                    suffix = target_path.suffix
                    folder = target_path.parent
                    counter = 1
                    while True:
                        candidate = folder / f"imported_{stem}_{counter}{suffix}"
                        if not (dst_dir / "word" / candidate).exists():
                            target_path = candidate
                            break
                        counter += 1
                    dst_part = dst_dir / "word" / target_path
                    new_rel.set("Target", target_path.as_posix())
                dst_part.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_part, dst_part)

        dst_rels.append(new_rel)

    for el in inserted_elements:
        for attr in (f"{{{R}}}embed", f"{{{R}}}id", f"{{{R}}}link"):
            for node in el.xpath(f".//*[@r:{attr.split('}')[1]}]", namespaces=NS):
                old_id = node.get(attr)
                if old_id in copied:
                    node.set(attr, copied[old_id])

    etree.ElementTree(dst_rels).write(str(dst_rels_path), xml_declaration=True, encoding="UTF-8", standalone=True)


def page_break_paragraph():
    p = etree.Element(f"{{{W}}}p", nsmap={"w": W, "r": R})
    r = etree.SubElement(p, f"{{{W}}}r")
    br = etree.SubElement(r, f"{{{W}}}br")
    br.set(f"{{{W}}}type", "page")
    return p


def has_page_break(p):
    return bool(p.xpath(".//w:br[@w:type='page']", namespaces=NS))


def make_title_page(body, children, title: str):
    idx = find_para_index(children, title, exact=True)
    title_p = children[idx]

    if idx > 0 and not has_page_break(children[idx - 1]):
        br_before = page_break_paragraph()
        body.insert(body.index(title_p), br_before)
        children.insert(idx, br_before)
        idx += 1
        title_p = children[idx]

    if idx + 1 < len(children) and not has_page_break(children[idx + 1]):
        br_after = page_break_paragraph()
        body.insert(body.index(title_p) + 1, br_after)
        children.insert(idx + 1, br_after)


def patch_docx():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        base_dir = tmp / "base"
        ch4_dir = tmp / "ch4"
        bib_dir = tmp / "bib"
        for path, dest in [(BASE, base_dir), (CH4, ch4_dir), (BIB, bib_dir)]:
            dest.mkdir()
            with ZipFile(path) as z:
                z.extractall(dest)

        doc_path = base_dir / "word" / "document.xml"
        doc = etree.parse(str(doc_path)).getroot()
        body, children = body_children(doc)

        ch4_elements = body_content(CH4)
        copy_related_parts(ch4_dir, base_dir, ch4_elements)
        ch4_start = find_para_index(
            children,
            "CHAPITRE 4 : CONCEPTION, IMPLEMENTATION ET EVALUATION DU PROTOTYPE",
            exact=True,
        )
        conclusion_start = find_para_index(children, "CONCLUSION GENERALE", start=ch4_start + 1)
        for el in children[ch4_start:conclusion_start]:
            body.remove(el)
        for offset, el in enumerate(ch4_elements):
            body.insert(ch4_start + offset, el)

        body, children = body_children(doc)
        bib_elements = body_content(BIB)
        copy_related_parts(bib_dir, base_dir, bib_elements)
        bib_start = find_para_index(children, "WEBOGRAPHIE ET BIBLIOGRAPHIE", exact=True)
        annex_start = find_para_index(children, "ANNEXE 1", start=bib_start + 1)
        for el in children[bib_start:annex_start]:
            body.remove(el)
        for offset, el in enumerate(bib_elements):
            body.insert(bib_start + offset, el)

        body, children = body_children(doc)
        for title in [
            "CHAPITRE 1 : CADRE THEORIQUE ET ETAT DE L'ART",
            "CHAPITRE 2 : METHODOLOGIE DE L'ETUDE",
            "CHAPITRE 3 : PRESENTATION DE LA SITUATION (PRESENTATION DES DONNEES COLLECTEES / DES RESULTATS)",
            "Chapitre 4 : Conception, implementation et evaluation du prototype",
        ]:
            make_title_page(body, children, title)

        etree.ElementTree(doc).write(str(doc_path), xml_declaration=True, encoding="UTF-8", standalone=True)

        if OUT.exists():
            OUT.unlink()
        with ZipFile(OUT, "w", ZIP_DEFLATED) as out_zip:
            for file in base_dir.rglob("*"):
                if file.is_file():
                    out_zip.write(file, file.relative_to(base_dir).as_posix())

    print(OUT)


if __name__ == "__main__":
    patch_docx()
