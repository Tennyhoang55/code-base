# Sunway Quiz

Hệ thống kiểm tra kiến thức Sales Freight Forwarder, xây trên Next.js 16, Prisma 7 và Neon Postgres. Yêu cầu Node.js 20.19+ và pnpm 10.34.6.

## Chạy dự án

```powershell
corepack pnpm@10.34.6 install
corepack pnpm@10.34.6 db:deploy
corepack pnpm@10.34.6 db:seed
corepack pnpm@10.34.6 dev
```

Mở http://localhost:3000. Ở máy này, kết nối Neon đã có trong `.env.local` và `.env`, được Git bỏ qua. Khi cài trên máy khác, sao chép `.env.example`: `DATABASE_URL` dùng kết nối pooled; `DIRECT_URL` dùng kết nối direct cho Prisma CLI. Không đưa các file môi trường lên Git.

Seed khởi tạo ba chi nhánh Hà Nội, Hải Phòng, TP.HCM và 17 chủ đề / 222 câu hỏi từ `prisma/seed-data/questions.json`, bao gồm 23 câu chương 05. Chạy lại seed giữ nguyên nội dung và cấu hình đã sửa.

Nếu chưa có quản trị, seed tạo mã nhân viên `ADMIN`, sinh mật khẩu tạm và ghi vào `.local/admin-initial.txt`. File này được Git bỏ qua. Đăng nhập bắt buộc đổi mật khẩu, sau đó xóa file mật khẩu tạm. Seed không đặt lại mật khẩu quản trị có sẵn.

## Sử dụng

Ngày sinh trên form người làm bài được gõ theo `dd/mm/yyyy`; hệ thống tự chèn dấu `/` và kiểm tra ngày hợp lệ trước khi lưu. Bảng xếp hạng dành cho người có phiên khai báo và quản trị; không yêu cầu hoàn thành bài để xem. Vì khai báo không cần xác minh tài khoản, ai có đường dẫn cũng có thể khai báo rồi xem khi cấu hình cho phép. Quản trị có thể tắt **Nhân sự xem bảng xếp hạng** trong Cấu hình.

Nhân sự mới và thực tập sinh mở `/dang-nhap`, khai báo **họ tên, ngày sinh, phòng ban, chi nhánh** rồi làm bài, không cần tài khoản hay mật khẩu. Phòng ban chỉ gồm **Sales, CS, OPS, Thực tập sinh**; không có trường nhóm riêng. Phiên riêng trên trình duyệt giữ tối đa 30 ngày để tiếp tục bài và xem lịch sử. Dùng máy khác, xóa dữ liệu trình duyệt, hết phiên hoặc chọn **Đổi người làm bài** sẽ tạo hồ sơ mới, kể cả khai báo trùng thông tin. Quản trị vẫn giữ toàn bộ kết quả; hệ thống không dùng thông tin tự khai báo để mở lại hồ sơ cũ.

Người làm bài chọn chủ đề hoặc thi tổng hợp, tiếp tục bài đang dở, xem kết quả, lịch sử và xếp hạng. Đáp án được lưu lên database và bộ nhớ trình duyệt; khi kết nối lại, thiết bị đồng bộ các lựa chọn chưa gửi. Bài có giới hạn giờ chỉ nhận đáp án trước thời hạn theo giờ máy chủ. Bài không giới hạn giờ bỏ dở 24 giờ bị hủy khi hệ thống kiểm tra trạng thái.

Quản trị đăng nhập riêng tại `/dang-nhap?mode=admin`, dùng tab **Quản trị** để quản lý hồ sơ, chi nhánh, câu hỏi, ma trận tiến độ, kết quả, cấu hình, báo cáo và nhật ký. Ngày sinh và phòng ban có trong hồ sơ và báo cáo quản trị, không đưa lên bảng xếp hạng. Hồ sơ tự khai báo không có mật khẩu và không thể nâng thành quản trị; tạo tài khoản quản trị riêng khi cần.

Mục **Danh sách nhân sự cũ (CSV / Excel)** giữ công cụ nhập danh sách theo mã từ phiên bản trước: **Mã NV, Họ tên, Chi nhánh, Email**, tối đa 1.000 dòng / 2 MB. Danh sách này không tự ghép với hồ sơ tự khai báo và không cần dùng cho luồng làm bài mới. Đăng nhập bằng mật khẩu hiện chỉ dành cho quản trị.

Ngân hàng câu hỏi nhập/xuất theo định dạng `questions.json`, tối đa 2 MB / 5.000 câu mỗi lượt nhập. Câu trùng mã được cập nhật; trạng thái ẩn và lịch sử bài làm được giữ. Báo cáo Excel tải trong khu vực quản trị, có bộ lọc và ngày xuất.

Ngưỡng đạt mặc định 80%, bài tổng hợp 40 câu, số lượt không giới hạn. Ngưỡng được ghi vào từng bài khi nộp; thay đổi cấu hình không sửa kết quả cũ. Bảng tổng điểm và ma trận dùng ngân hàng đang bật để cập nhật điểm tối đa; kết quả và lịch sử vẫn hiển thị điểm và bộ câu tại thời điểm làm.

## Kiểm tra

```powershell
corepack pnpm@10.34.6 lint
corepack pnpm@10.34.6 typecheck
corepack pnpm@10.34.6 build
```

Kiểm thử database và trình duyệt chạy trên nhánh Neon riêng. Không dùng database production cho kiểm thử. Máy này có nhánh `verify-sunway-quiz-20261008` với thời hạn tự xóa; khi nhánh hết hạn, tạo một nhánh kiểm thử mới và cập nhật `.local/test.env`:

```powershell
neon branches create --name verify-sunway-quiz --parent production --no-secrets
neon env pull --branch verify-sunway-quiz --file .local/test.env -s postgres
node scripts/verify.mjs migrate
node scripts/verify.mjs seed
node scripts/verify.mjs test
corepack pnpm@10.34.6 exec playwright install chromium
corepack pnpm@10.34.6 build
node scripts/verify.mjs e2e
```

Script xác nhận hostname của database kiểm thử khác production trước khi chạy. E2E khởi động server kiểm thử ở cổng 3100 và tạo tài khoản fixture trên nhánh kiểm thử. Không chạy server kiểm thử trên cổng này cùng lúc với E2E. Kết quả kiểm thử / ảnh chụp nằm trong các thư mục được Git bỏ qua.

## Triển khai

Ứng dụng cần hosting Node.js hỗ trợ Next.js App Router, Server Actions và streaming. Cấu hình các biến môi trường, chạy `pnpm db:deploy`, `pnpm db:generate`, `pnpm build`, rồi `pnpm start`. Production cần HTTPS để trình duyệt gửi cookie phiên có cờ Secure. Không chạy migration trên app startup và không dùng lệnh reset database.

`neon deploy` quản lý cấu hình Neon trong `neon.ts`; ứng dụng Next.js được triển khai trên hosting riêng. Các tính năng đăng nhập Google/Microsoft, đợt thi theo lịch, nhắc email/Zalo và chứng nhận nằm ngoài đợt triển khai này, theo `docs/FEATURES.md`.

Chi tiết cấu trúc và bảo mật trong `ARCHITECTURE.md`; yêu cầu nghiệp vụ trong `docs/FEATURES.md`.
