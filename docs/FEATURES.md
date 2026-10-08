# Sunway Quiz – Mô tả tính năng

> Luồng khai báo không mật khẩu và bốn phòng ban theo mục “Điều chỉnh theo yêu cầu đã chốt” cuối tài liệu thay thế các quy tắc đăng nhập nhân sự ban đầu.

> Hệ thống kiểm tra kiến thức Sales Freight Forwarder cho nhân sự Sunway Logistics.
> Tài liệu chỉ mô tả tính năng và quy tắc nghiệp vụ. Phần kỹ thuật theo code base hiện có.
> Tài liệu tham khảo đi kèm:
> - `questions.json`: 222 câu hỏi, 17 chủ đề.
> - `prototype.html`: giao diện mẫu.

---

## 1. Mục tiêu

- Nhân sự làm bài kiểm tra theo từng chương của "Cẩm nang đào tạo Sales Freight Forwarder".
- Hệ thống chấm điểm, lưu kết quả, cho xem lại đáp án kèm giải thích.
- Có bảng xếp hạng để tạo động lực học.
- Quản lý đào tạo theo dõi tiến độ từng người, biết nội dung nào nhân sự còn yếu, và xuất báo cáo.

## 2. Người dùng

| Vai trò | Làm được gì |
|---|---|
| **Nhân sự** | Làm bài, xem kết quả và lịch sử của mình, xem bảng xếp hạng |
| **Quản trị (Admin)** | Mọi quyền của nhân sự, cùng quản lý tài khoản, câu hỏi, cấu hình, xem kết quả của mọi người, xuất báo cáo |

Mỗi nhân sự thuộc một **chi nhánh**: Hà Nội, Hải Phòng, TP.HCM. Admin thêm được chi nhánh mới.

---

## 3. Tính năng cho nhân sự

### 3.1 Đăng nhập
- Đăng nhập bằng **mã nhân viên và mật khẩu**. Không có đăng ký tự do, tài khoản do admin tạo.
- Lần đăng nhập đầu tiên, hoặc sau khi admin đặt lại mật khẩu, bắt buộc đổi mật khẩu (tối thiểu 8 ký tự).
- Nhập sai 5 lần liên tiếp thì tạm khóa đăng nhập 15 phút.
- Quên mật khẩu: màn hình hiện hướng dẫn liên hệ admin để được cấp mật khẩu tạm.
- Có nút Đăng xuất. Không thao tác 8 giờ thì tự đăng xuất.
- Người dùng tự đổi mật khẩu được trong phần tài khoản.

### 3.2 Trang chủ
- **Đầu trang**: họ tên, chi nhánh, các tab "Làm bài", "Bảng xếp hạng", "Lịch sử của tôi". Admin có thêm tab "Quản trị".
- **3 ô thống kê cá nhân**:
  - Số chủ đề đã làm / 17.
  - Tổng điểm tốt nhất / 222.
  - Hạng tổng hiện tại, dạng `#3/45`.
- **Danh sách bài thi**:
  - Thẻ "Thi tổng hợp" nằm đầu tiên.
  - 17 chủ đề nhóm theo phần: Phần mở đầu, Phần I – Kiến thức phải học, Phần II – Kỹ năng phải rèn, Phụ lục.
  - Mỗi dòng có mã chương, tên chủ đề, số câu, và chip điểm tốt nhất của người dùng:
    - Xanh: đạt (≥ ngưỡng đạt), ví dụ `9/10 · 90%`.
    - Đỏ: chưa đạt.
    - Xám: "Chưa làm".

### 3.3 Làm bài
- Bấm vào chủ đề để bắt đầu ngay.
- **Nội dung bài**:
  - Bài theo chủ đề gồm toàn bộ câu hỏi đang bật của chủ đề đó.
  - Thi tổng hợp lấy ngẫu nhiên N câu từ mọi chủ đề (mặc định 40). Mỗi lần làm ra bộ câu khác nhau.
- **Xáo trộn**: thứ tự câu hỏi và thứ tự 4 đáp án được xáo lại ở mỗi lượt làm.
- **Màn hình làm bài**:
  - Mỗi lần hiện **1 câu**, có thanh tiến độ, số thứ tự (`Câu 3 / 10 · đã trả lời 2`) và đồng hồ đếm giờ.
  - Bấm vào một đáp án để chọn, bấm đáp án khác để đổi lựa chọn.
  - Có nút "Câu trước" và "Câu tiếp". Ở câu cuối, nút chuyển thành "Nộp bài".
  - Lưới số câu để nhảy nhanh. Câu đã trả lời và câu đang xem được tô khác màu.
  - Nút "Nộp bài sớm" và "Thoát bài".
- **Không mất bài**: lỡ tải lại trang, mất mạng hay đóng trình duyệt thì quay lại vẫn còn các đáp án đã chọn, đồng hồ vẫn tính tiếp.
- **Giới hạn thời gian** (nếu admin bật cho chủ đề): hiện đồng hồ đếm ngược, hết giờ tự nộp bài.
- **Nộp bài**: hiện hộp xác nhận ngay trong trang:
  - "Còn X câu chưa trả lời. Câu bỏ trống tính là sai. Nộp bài ngay?"
  - Hai nút: [Nộp bài] / [Làm tiếp].
- **Thoát bài**: xác nhận trước khi thoát. Bài đã thoát không được tính điểm.
- Mỗi người chỉ có **1 bài đang làm dở**. Bắt đầu bài mới thì bài dở trước đó bị hủy, có cảnh báo trước khi hủy.
- Bài bỏ dở quá 24 giờ tự hủy.

### 3.4 Kết quả sau khi nộp
- **Phần điểm**:
  - Điểm lớn dạng `8/10`, nhãn **Đạt** hoặc **Chưa đạt** kèm phần trăm.
  - Thời gian làm bài, ngưỡng đạt.
  - Hạng hiện tại của người dùng ở chủ đề đó, dạng `#5/32`.
- **Nút hành động**: "Làm lại", "Chọn chủ đề khác", "Xem bảng xếp hạng".
- **Xem lại đáp án**: hiện từng câu, câu đúng có viền xanh, câu sai có viền đỏ. Mỗi câu gồm:
  - Đáp án đã chọn, hoặc "(bỏ trống)".
  - Đáp án đúng.
  - Giải thích kèm mục tham chiếu trong cẩm nang (ví dụ "Mục 5.4: …").
- Nút lọc **"Chỉ xem câu sai"** / "Hiện tất cả câu".
- Nếu admin tắt "Hiện đáp án sau khi nộp" thì chỉ hiện điểm, không hiện phần xem lại.

### 3.5 Bảng xếp hạng
- **Chọn bảng**:
  - Tổng điểm.
  - Thi tổng hợp.
  - Từng chủ đề (01 → 16, Phụ lục).
- **Bộ lọc**:
  - Chi nhánh: Tất cả / Hà Nội / Hải Phòng / TP.HCM.
  - Thời gian: Tất cả / Tháng này / Khoảng tùy chọn.
- **Bảng theo chủ đề**:
  - Mỗi người chỉ tính **lần làm tốt nhất**.
  - Thứ tự: % cao hơn đứng trên. Bằng % thì ai làm nhanh hơn đứng trên. Vẫn bằng thì ai đạt kết quả đó sớm hơn đứng trên.
  - Cột: Hạng · Họ tên · Chi nhánh · Điểm · % · Thời gian · Số lần làm.
- **Bảng tổng điểm**:
  - Cộng số câu đúng ở lần làm tốt nhất của từng chủ đề. **Không cộng bài thi tổng hợp.**
  - Điểm tối đa bằng tổng số câu đang bật (hiện là 222).
  - Thứ tự: tổng điểm, rồi số chủ đề đã làm, rồi tổng thời gian.
  - Cột: Hạng · Họ tên · Chi nhánh · Tổng điểm · Số chủ đề đã làm · Số chủ đề đạt.
- Top 3 có huy hiệu vàng, bạc, đồng. Dòng của người đang xem được tô nổi và ghi "(bạn)".
- Tài khoản admin và tài khoản bị khóa không xuất hiện trên bảng xếp hạng.
- Nếu admin tắt "Nhân sự xem bảng xếp hạng" thì tab này chỉ hiện với admin.

### 3.6 Lịch sử của tôi
- Danh sách các bài đã nộp, mới nhất ở trên. Cột: Ngày giờ · Chủ đề · Điểm · % · Thời gian · Đạt/Chưa đạt.
- Lọc được theo chủ đề.
- Bấm vào một bài để xem lại đúng bộ câu, thứ tự và đáp án đã chọn lúc làm (theo cấu hình hiện đáp án).

---

## 4. Tính năng cho quản trị (Admin)

### 4.1 Tổng quan (Dashboard)
- **Số liệu chính**:
  - Tổng số nhân sự.
  - Số người đã làm ít nhất 1 bài.
  - Số lượt làm trong tháng.
  - Tỷ lệ đạt chung.
- **Tỷ lệ đạt theo chủ đề**: biểu đồ cột cho 17 chủ đề.
- **10 câu bị trả lời sai nhiều nhất**: câu hỏi, chủ đề, tỷ lệ sai. Giúp biết nội dung cần đào tạo lại.
- **Nhân sự chưa làm bài nào**: danh sách để nhắc.
- Lọc toàn bộ dashboard theo chi nhánh và khoảng thời gian.

### 4.2 Quản lý nhân sự
- Danh sách nhân sự có tìm theo tên hoặc mã, lọc theo chi nhánh, vai trò, trạng thái.
- Thêm/sửa nhân sự: mã nhân viên (không trùng), họ tên, chi nhánh, email (không bắt buộc), vai trò.
- **Khóa / mở khóa** tài khoản. Người bị khóa không đăng nhập được, kết quả cũ vẫn giữ.
- **Đặt lại mật khẩu**: hệ thống sinh mật khẩu tạm, hiển thị **một lần duy nhất** để admin gửi cho nhân sự. Nhân sự bắt buộc đổi ở lần đăng nhập sau.
- **Nhập hàng loạt từ file Excel/CSV**:
  - Có file mẫu tải về, gồm các cột: Mã NV, Họ tên, Chi nhánh, Email.
  - Trước khi nhập, hiện bản xem trước: bao nhiêu dòng hợp lệ, dòng nào lỗi (ghi rõ số dòng và lý do: trùng mã, thiếu tên, chi nhánh không tồn tại…).
  - Admin xác nhận thì mới nhập. Sau khi nhập, xuất được danh sách mật khẩu tạm.
- Quản lý danh sách chi nhánh (thêm, sửa tên).

### 4.3 Ma trận tiến độ
- Bảng gồm hàng là nhân sự, cột là 17 chủ đề và thi tổng hợp.
- Mỗi ô là % tốt nhất, tô màu: xanh (đạt), đỏ (chưa đạt), xám (chưa làm).
- Cột cuối: tổng điểm, số chủ đề đạt.
- Lọc theo chi nhánh. Bấm vào tên một người để xem chi tiết người đó.
- Xuất Excel.

### 4.4 Chi tiết một nhân sự
- Thông tin tài khoản, lần đăng nhập gần nhất.
- Điểm tốt nhất từng chủ đề, số lần làm.
- Toàn bộ lịch sử bài làm. Bấm vào một bài để xem từng câu đúng/sai.

### 4.5 Kết quả bài làm
- Danh sách tất cả bài đã nộp của mọi người.
- Lọc theo nhân sự, chủ đề, chi nhánh, khoảng ngày, đạt/chưa đạt.
- Xem chi tiết từng bài.
- Xuất Excel theo bộ lọc đang chọn.

### 4.6 Quản lý câu hỏi
- **Chủ đề**:
  - Sửa tên và nhóm phần, sắp xếp thứ tự, bật/tắt chủ đề.
  - Đặt giới hạn thời gian riêng cho từng chủ đề (để trống là không giới hạn).
- **Câu hỏi trong chủ đề**:
  - Danh sách có tìm kiếm. Mỗi câu hiện tỷ lệ trả lời đúng.
  - Thêm/sửa câu: nội dung câu hỏi, 4 đáp án, chọn 1 đáp án đúng, giải thích.
  - **Ẩn câu** thay vì xóa. Câu đã có người làm thì không xóa hẳn, để lịch sử vẫn xem lại được.
  - Xem trước câu hỏi như nhân sự sẽ thấy.
- **Nhập / xuất ngân hàng câu hỏi**:
  - Nhập từ file JSON (định dạng như `questions.json`). Câu trùng mã thì cập nhật, câu mới thì thêm.
  - Hiện bản xem trước số câu thêm mới và cập nhật trước khi xác nhận.
  - Xuất toàn bộ ra JSON và Excel.
- Khi số câu thay đổi, điểm tối đa của bảng tổng điểm tự cập nhật theo.

### 4.7 Cấu hình chung

| Cấu hình | Mặc định | Ý nghĩa |
|---|---|---|
| Ngưỡng đạt | 80% | Đạt khi % ≥ ngưỡng. Áp dụng cho các bài nộp sau khi đổi |
| Số câu thi tổng hợp | 40 | Số câu lấy ngẫu nhiên |
| Hiện đáp án sau khi nộp | Bật | Tắt thì nhân sự chỉ thấy điểm |
| Nhân sự xem bảng xếp hạng | Bật | Tắt thì chỉ admin xem |
| Số lần làm tối đa mỗi chủ đề | 0 (không giới hạn) | Hết lượt thì nút làm bài bị khóa, kèm thông báo |

### 4.8 Xuất báo cáo Excel
- **Tổng hợp theo nhân sự**: mã, họ tên, chi nhánh, số chủ đề đã làm, số chủ đề đạt, tổng điểm, hạng.
- **Ma trận tiến độ**: như mục 4.3.
- **Toàn bộ bài làm**: ngày giờ, nhân sự, chủ đề, điểm, %, thời gian, đạt/chưa.
- **Thống kê câu hỏi**: mỗi câu kèm số lượt trả lời và tỷ lệ đúng.
- File mở được bằng Excel, tiếng Việt hiển thị đúng. Tên file có ngày xuất.

### 4.9 Nhật ký hoạt động
Ghi lại và cho admin xem: đăng nhập, đặt lại mật khẩu, khóa tài khoản, sửa câu hỏi, đổi cấu hình, nhập dữ liệu. Mỗi dòng gồm ai, lúc nào, làm gì.

---

## 5. Quy tắc nghiệp vụ quan trọng

1. **Điểm do hệ thống tính.** Người làm bài không thể tự sửa điểm hay thời gian.
2. **Không lộ đáp án trước khi nộp.** Trong lúc làm bài, đáp án đúng và giải thích không có ở phía trình duyệt.
3. **Thời gian làm bài** tính từ lúc bắt đầu đến lúc nộp, theo giờ hệ thống, không theo đồng hồ máy người dùng.
4. **Câu bỏ trống tính là sai.**
5. **Lần làm tốt nhất** dùng cho bảng xếp hạng và chip điểm trên trang chủ. Mọi lần làm đều lưu trong lịch sử.
6. Người dùng chỉ xem được bài làm của chính mình. Admin xem được của tất cả.
7. Sửa câu hỏi không làm thay đổi kết quả các bài đã nộp trước đó.

## 6. Giao diện

- Theo `prototype.html`:
  - Màu nền đầu trang xanh navy, màu nhấn vàng.
  - Xanh lá cho Đạt, đỏ cho Chưa đạt.
  - Có logo Sunway ở đầu trang.
- Dùng tốt trên **điện thoại** và máy tính:
  - Không cuộn ngang.
  - Nút đủ lớn để chạm.
  - Bảng rộng thì cuộn ngang trong khung riêng.
- Có chế độ tối theo cài đặt của máy.
- Toàn bộ nội dung bằng **tiếng Việt**. Ngày giờ dạng `dd/mm/yyyy HH:mm`, giờ Việt Nam.
- Thông báo lỗi nói rõ chuyện gì xảy ra và cách xử lý, ví dụ "Mất kết nối. Đáp án của bạn vẫn được lưu, thử nộp lại sau vài giây."
- Chân trang có dòng thông báo về xử lý dữ liệu cá nhân (theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15): hệ thống chỉ lưu mã NV, họ tên, chi nhánh, email và kết quả bài làm, phục vụ đào tạo nội bộ.

## 7. Nội dung ban đầu

- 17 chủ đề, 222 câu trong `questions.json`. Trong file này, đáp án đầu tiên của mỗi câu là đáp án đúng. Hệ thống phải xáo trộn khi hiển thị.

| Mã | Chủ đề | Số câu |
|---|---|---|
| 01 | Chuỗi giá trị ngành logistics | 10 |
| 02 | Freight forwarder – nghề của chúng ta | 13 |
| 03 | Lập thân – lập nghiệp: tư duy sales Sunway | 9 |
| 04 | Ngoại thương: Incoterms, thanh toán, quy trình | 21 |
| 05 | Chứng từ logistics và thuật ngữ | 23 |
| 06 | Các đối tượng liên quan: hãng tàu, cảng, hải quan, thuế | 20 |
| 07 | Thị trường và phân khúc khách hàng | 17 |
| 08 | Báo giá và pricing | 14 |
| 09 | Sales pipeline và tìm kiếm khách hàng | 13 |
| 10 | Lập kế hoạch, thực thi và báo cáo | 11 |
| 11 | Giao tiếp và tạo mối quan hệ | 10 |
| 12 | Làm việc nhóm | 9 |
| 13 | Kỹ năng telesales | 10 |
| 14 | Kỹ năng xử lý từ chối | 12 |
| 15 | Set up và gặp gỡ khách hàng | 11 |
| 16 | Chốt sales và chăm sóc khách hàng | 12 |
| PL | Lộ trình 8 tuần và 10 câu nói cần nhớ | 7 |

## 8. Tiêu chí nghiệm thu

**Đăng nhập**
- [ ] Đăng nhập lần đầu bị yêu cầu đổi mật khẩu.
- [ ] Sai mật khẩu 5 lần thì bị tạm khóa 15 phút.

**Làm bài**
- [ ] Chủ đề 05 hiện đủ 23 câu. Hai lần làm có thứ tự câu và đáp án khác nhau.
- [ ] Tải lại trang giữa bài vẫn còn đáp án đã chọn, đồng hồ không bị đặt lại.
- [ ] Hết giờ (khi có giới hạn) thì bài tự nộp.
- [ ] Không xem được đáp án đúng trước khi nộp, kể cả bằng công cụ của trình duyệt.

**Kết quả và xếp hạng**
- [ ] Đạt/Chưa đạt đúng theo ngưỡng. Đổi ngưỡng sang 70% thì áp dụng cho bài nộp sau đó.
- [ ] Bảng xếp hạng chủ đề dùng lần làm tốt nhất. Hai người cùng % thì người nhanh hơn đứng trên.
- [ ] Bảng tổng điểm không cộng thi tổng hợp. Ẩn 1 câu thì điểm tối đa giảm 1.
- [ ] Lọc chi nhánh Hải Phòng chỉ hiện nhân sự Hải Phòng.

**Quản trị**
- [ ] Nhập 50 nhân sự từ file mẫu. Dòng lỗi được báo rõ số dòng và lý do.
- [ ] Ẩn một câu hỏi thì bài làm cũ vẫn xem lại được câu đó.
- [ ] Xuất Excel ma trận tiến độ mở bằng Excel không lỗi tiếng Việt.

**Giao diện**
- [ ] Trên điện thoại rộng 360px không có cuộn ngang, làm trọn bài chỉ bằng chạm.

## 9. Để sau (chưa làm đợt này)

- Đăng nhập bằng email Google/Microsoft của công ty.
- Đợt thi có lịch mở/đóng (ví dụ "Kiểm tra cuối khóa tuần 6"), giao bài cho nhóm nhân sự cụ thể.
- Nhắc nhân sự chưa làm bài qua email hoặc Zalo.
- Chứng nhận hoàn thành khi đạt toàn bộ 17 chủ đề.

## Điều chỉnh theo yêu cầu đã chốt (08/10/2026)

Các điều chỉnh sau thay thế yêu cầu đăng nhập nhân sự bằng mật khẩu trong tài liệu gốc bên trên:

- Nhân sự mới và thực tập sinh khai báo họ tên, ngày sinh, phòng ban và chi nhánh để làm bài, không cần tài khoản hoặc mật khẩu.
- Phòng ban gồm Sales, CS, OPS, Thực tập sinh. Bỏ trường nhóm riêng.
- Phiên riêng trên trình duyệt cho phép tiếp tục bài và xem kết quả của chính hồ sơ đó. Đổi máy, xóa dữ liệu, hết phiên hoặc đổi người làm bài sẽ tạo hồ sơ mới; không tự ghép dựa trên thông tin khai báo. Quản trị xem toàn bộ kết quả.
- Quản trị vẫn đăng nhập bằng mật khẩu. Hồ sơ người làm bài không thể nâng thành quản trị hoặc đặt mật khẩu.
- Ngày sinh và phòng ban được lưu trong hồ sơ, báo cáo quản trị; bảng xếp hạng không công khai hai trường này.

---
