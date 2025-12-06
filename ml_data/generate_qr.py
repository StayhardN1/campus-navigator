import os
import pandas as pd
import qrcode
from qrcode.constants import ERROR_CORRECT_M  # M = ~15% ошибок коррекции

NODES_CSV = "nodes.csv"
OUT_DIR = "QR codes"
BASE_URL = None

os.makedirs(OUT_DIR, exist_ok=True)
df = pd.read_csv(NODES_CSV, dtype=str).fillna('')

# Настройки QR
error_level = ERROR_CORRECT_M
box_size = 10  # размер одного модуля в пикселях
border = 4     # стандартная граница

for _, row in df.iterrows():
    node_id = (row.get('id') or '').strip()
    typ = (row.get('type') or '').strip()
    if not node_id or typ != 'qr_node':
        continue

    payload = (BASE_URL + node_id) if BASE_URL else node_id

    qr = qrcode.QRCode(
        version=None,
        error_correction=error_level,
        box_size=box_size,
        border=border,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    png_path = os.path.join(OUT_DIR, f"{node_id}.png")
    img.save(png_path)
    print("Сохранено:", png_path)