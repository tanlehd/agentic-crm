# Healthcare reference case và fixtures

Status: Ready for implementation fixtures M1–M2; continuation M4 là Draft.

## Case ngành

Phòng khám nhận tin từ Meta CTM, thu nhu cầu tư vấn hành chính, qualify và bàn giao Sale đặt hẹn/bán gói dịch vụ. Google Ads lead form là nguồn đầu vào thứ hai ở M4. Không bao gồm bệnh án, chẩn đoán hoặc quyết định điều trị.

Appointment và ServiceOffering là custom objects, không tạo module/bảng healthcare riêng. Appointment liên kết Contact, Deal và ServiceOffering qua association types; status draft/booked/completed/cancelled, start_at/end_at UTC, location. ServiceOffering có name, category, duration_minutes, list_price, currency. Appointment phải có end_at > start_at; cross-field validation/scheduling engine chốt ở M4.

## Fixture registry

Các alias dưới map sang UUID cố định khi viết seed/test; không dùng alias làm wire UUID. Tất cả là dữ liệu tổng hợp.

| Alias | Cấu hình |
|---|---|
| clinic_alpha | Tenant chính; timezone Asia/Ho_Chi_Minh |
| clinic_beta | Tenant đối chứng; cùng label/team/provider subject để thử isolation |
| alpha_admin | Human admin seat + tenant_admin role |
| chat_anna | Human chat seat; conversation read/reply/note/takeover team, contact read team, lead create/qualify/handoff team |
| intake_ai | AI principal; intake team; conversation read/reply own, contact read team, lead create/qualify own; allowed tools M2 |
| sales_binh / sales_chi | Human sales seat; sales team; lead read/accept team, contact read team; sales_binh được route trước theo UUID fixture |
| read_only | Viewer seat + read role; không mutation |
| ctm_service | Service actor: intake routing, session start, Lead create/qualify/handoff, Contact share vào Sales team; không schema/admin |
| mock_page_alpha | mock_messenger connection thuộc clinic_alpha |
| offering_a | Custom ServiceOffering “Tư vấn dịch vụ A”, 30 phút, price fixture 500000 VND |

Lead tạo từ Chatflow mặc định owner=session owner, team=intake, dù creator là service actor; application command kiểm tra owner và policy rồi set có audit. Vì vậy AI lead.qualify scope own hợp lệ. Source Contact owner NULL, intake team cấp read team.

## Dataset deterministic

Window `[2026-10-02T03:00:00Z, 2026-10-03T03:00:00Z)`, as_of cuối window. Mỗi dòng Conversation là Contact khác nhau; mỗi message inbound ID unique, replay bản trùng không tăng count.

| Conversation | CTM | Inbound unique | Outcome | Qualified | Handoff | Accepted |
|---|---|---:|---|---|---|---|
| conv_a | ad-fixture-01 | 3 | Nhu cầu A, Messenger, consent yes | 03:05 | 03:06 | 03:10 |
| conv_b | ad-fixture-01 | 2 | Khách từ chối liên hệ | — | — | — |
| conv_c | ad-fixture-02 | 4 | Nhu cầu A, đủ field; Sales chưa nhận | 04:00 | 04:01 | — |
| conv_d | không referral | 3 | Nhu cầu B, Messenger, consent yes | 05:00 | 05:01 | 05:03 |

Giờ trong bảng cùng ngày UTC. Prompt outbound fake sent đều sau inbound đầu 30 giây; các prompt sau không ảnh hưởng first_response. Fixture A có thêm một replay cùng provider event và một event ID khác trùng message ID; cả hai không tăng inbound unique.

Payload message dùng text tổng hợp: “Tôi quan tâm dịch vụ A”, “Tôi muốn tư vấn thời gian đặt hẹn, liên hệ qua Messenger”, “Tôi đồng ý để phòng khám liên hệ về nhu cầu này”. Consent evidence trỏ message thứ ba. Fixture B có “Tôi không đồng ý liên hệ tiếp”. Không dùng số điện thoại hoặc danh tính thật.

## KPI kỳ vọng

| Metric | Kết quả |
|---|---:|
| inbound_messages | 12 |
| new_conversations / unique_contacts | 4 / 4 |
| ctm_conversations | 3 |
| qualified_leads | 3 |
| ctm_to_qualified | 2 / 3 = 66,67% |
| lead_acceptance_rate | 2 / 3 = 66,67% |
| handoff pending | 1 |
| handoff acceptance median | median(4 phút, 2 phút) = 3 phút |
| first response median | 30 giây |

Disqualified không bắt buộc tạo Lead nếu dừng trước upsert; KPI ở đây không dùng tổng raw Lead làm mẫu số. Customer conversion chưa tính ở M2; hiển thị unavailable, không fake 0 doanh thu như dữ liệu thật.

## Continuation M4

Lead A accepted → tạo Deal A → tạo Appointment liên kết ServiceOffering A → xác nhận đặt hẹn → ghi nhận Deal won amount 500000 VND → Contact A customer_since=won_at. Đặt hẹn không tự thắng Deal. Không coi list_price của ServiceOffering là doanh thu đã thu tiền.

Google Ads form dùng submission identity để chống trùng; campaign/form attribution và consent lưu theo form evidence. Không tự merge với Contact Messenger chỉ dựa tên; linkage dựa identity đã xác minh và merge policy được thiết kế ở M4.

Template ngành gồm acquisition funnel, chat qualification, handoff latency, sales pipeline và lịch hẹn; custom report dùng cùng grain/metric semantics ở [Reporting](../modules/reporting.md).

SRC-009 Identity fixture scope và repeat/credential policy: [bootstrap contract](../contracts/bootstrap.md). Registry và dữ liệu ngành chưa thuộc seed này.

SRC-023 executable refinement: exact consent evidence uses `đồng ý` / `không đồng ý`; A/D cover Human completion after AI prompt, C automated collect, B short refusal graph. Counts and outcomes above unchanged. See [fixture contract](../contracts/healthcare-fixture.md).
