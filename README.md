# BISC Audit Simulation 2026 — Landing page

Landing page cho chương trình mô phỏng audit engagement dành riêng cho học viên BISC
(22/10 – 31/10/2026, offline, miễn phí, hạn đăng ký 15/10/2026).

## Nội dung repo

| File | Mô tả |
|---|---|
| `index.html` | Trang landing hoàn chỉnh. Một file duy nhất, không cần thư mục asset — toàn bộ 18 ảnh nhúng inline dạng base64 WebP. |
| `og-image.jpg` | Ảnh preview 1200×630 cho Open Graph / Zalo / Facebook. Phải nằm cùng cấp với `index.html`. |
| `backup-v45-original.html` | Bản gốc 30 MB trước khi nén ảnh, giữ để đối chiếu. Không dùng để deploy. |

## ⚠️ Cần làm trước khi deploy

Mở `index.html`, tìm và thay **`https://YOUR-DOMAIN.com/`** bằng URL thật của trang.
Chuỗi này xuất hiện trong `<link rel="canonical">`, các thẻ Open Graph / Twitter và khối
JSON-LD.

Trang có sẵn một script tự vá các URL đó theo `location.href` lúc chạy, nhưng **crawler
của Zalo và Facebook không chạy JavaScript** — nên vẫn phải sửa tay một lần.

Ngoài ra, JSON-LD `EducationEvent` đang để địa điểm là `BISC Training Center, Hà Nội`.
Điền `streetAddress` thật nếu muốn Google hiển thị rich result cho sự kiện.

## Số đo hiện tại

Đo bằng Chrome headless, mobile 390px, CPU throttle 4×, mạng 10 Mbps:

| Chỉ số | Giá trị | Ngưỡng "Good" |
|---|---|---|
| LCP | ~1,5 s | < 2,5 s |
| FCP | ~0,9 s | < 1,8 s |
| CLS | ~0,02 | < 0,1 |
| Kích thước tải | 3,4 MB | — |

## Ghi chú kỹ thuật

- Ảnh dùng base64 **WebP** thay vì PNG/JPEG: 31,4 MB → 3,2 MB, LCP mobile 7,6 s → 1,5 s,
  vẫn giữ được tính chất "một file mang đi đâu cũng chạy".
- Có hai `@font-face` fallback khớp metric (`BVP Fallback`, `LS Fallback`) để lúc webfont
  swap không làm nhảy layout.
- `.hero-grid` xếp dọc ở `max-width: 900px`.
