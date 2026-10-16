# Book fonts (embedded in PDFs)

Storyling story typefaces (design/storyling/tokens/typography.css `--font-story-*`),
bundled as files so the PDF renderer can embed them. The web app loads the same
families through next/font.

- Andika — story text (Latin). SIL Open Font License 1.1 (`OFL-Andika.txt`)
- Baloo Bhaijaan 2 — Arabic story text and titles. SIL OFL 1.1 (`OFL-BalooBhaijaan2.txt`).
  `BalooBhaijaan2-400/700.ttf` are static instances of the variable font, made with
  `python -m fontTools.varLib.instancer BalooBhaijaan2[wght].ttf wght=400` (and 700),
  because Chromium embeds variable fonts as Type 3, which print shops often reject.

Source: https://github.com/google/fonts (ofl/andika, ofl/baloobhaijaan2)
