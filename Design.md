#ng-Q: Design System & Screen Specifications for UI Generation

**Platform:** Jong-Q (Multi-Tenant Generic Queue Booking Platform)  
**Target Tool:** Google Stitch / UI Designers / Frontend Engineers  
**Target Device Types:**
- **Customer:** Mobile First (Optimized for LINE In-App Browser / LIFF screen ratio 9:16 & 390x844)
- **Merchant:** Tablet & Responsive Desktop / Mobile (iPad/Tablet 4:3 & 16:9)
- **Admin:** Desktop & Tablet (16:9 & 16:10)
---

## 1. Global Design Language & Theme Tokens

> **Decision (2026-10-15, owner):** Style **A - Risograph / Indie Zine**, adjusted per audience. Replaces the earlier emerald/slate palette. For visual style ignore the Material mockups in `UI/` (`jong_q_1`, `jong_q_2`, `jong_q_super_admin`) and the mono/brutalist ones (`jong_q_3`..`5`, `jong_q_store_settings`); keep them only for layout/content ideas. Reference mockup: `UI/jong_q_playful_hand_drawn_risograph_2`.

### 1.1 Color Palette (Tailwind tokens)
- **Canvas:** `canvas-paper` `#FAF6ED` (page), `canvas-card` `#FFFDF9` (cards), `canvas-muted` `#F3ECE0`
- **Ink:** `riso-indigo` `#162032` (text, 2-3px borders, hard shadows)
- **Accents:** `riso-orange` `#FF4924` (primary CTA, called), `riso-teal` `#0E8A7F` (success, approved, open), `riso-yellow` `#FDE047` (highlight, pending)
- **Muted text:** `riso-muted` `#68778D`
- **Status:** Waiting = indigo outline, Called = orange fill, Serving = teal fill, Skipped/Pending = yellow, Closed/Cancelled = orange outline

### 1.2 Typography & Shape
- **Customer pages (LIFF, directory, booking, live ticket):** headings `font-zine` (Mali), body `font-sans` (Prompt). Playful details allowed: `.border-sketch`, `.bg-riso-dots`, stickers.
- **Merchant & Admin pages:** `font-sans` (Prompt) only, no handwriting font; body 16px or larger, tap targets 48px or larger (tablet call board), little decoration. Same colors, borders and shadows as the customer side.
- **Queue numbers:** extra bold `font-mono` digits, `text-5xl` or larger.
- **Cards:** `rounded-riso` / `rounded-riso-lg` + `.riso-border` + `.riso-shadow` (4px 4px 0 #162032). **Buttons:** `.riso-btn` (press shifts 2px), primary height 52px on mobile.

---

## 2. Customer Flow Screens (Mobile / LINE LIFF)

### Screen C1: Homepage / Open Store Directory (หน้ารวมร้านค้าที่เปิดอยู่)
- **Purpose:** ลูกค้าเปิดดูร้านค้าที่เปิดรับคิวอยู่ในวันนี้ผ่าน LINE หรือหน้าแรกของเว็บ
- **Header:**
  - Logo "Jong-Q" + สโลแกน "จองคิวง่ายใน LINE"
  - ขวามือ: Avatar โปรไฟล์ LINE + ชื่อลูกค้า
  - **Active Ticket Sticky Banner (ถ้ามีคิวค้างอยู่):** แถบสีเขียวเรืองแสงด้านบน *"คุณมีคิวที่กำลังรอ: ร้านชาบูชิ (A-012) [แตะเพื่อดูสถานะ ➜]"*
- **Search & Filter Bar:**
  - กล่องค้นหาชื่อร้าน / พิกัด
  - หมวดหมู่แบบ Pill Buttons: "ทั้งหมด", "ร้านอาหาร/คาเฟ่", "คลินิก/สุขภาพ", "ตัดผม/เสริมสวย", "ศูนย์บริการ"
- **Store Cards Grid / List:**
  - รูปหน้าร้าน (Aspect Ratio 16:9)
  - Badge มุมขวา: `"● เปิดรับคิว"` (สีเขียว) *(แสดงเฉพาะร้านที่เปิดอยู่เท่านั้น)*
  - ชื่อร้านค้า + หมวดหมู่ + จังหวัด/พื้นที่
  - ข้อมูลคิวแบบ Real-time:
    - `"รออยู่ 4 คิว (รอประมาณ 20 นาที)"`
  - ปุ่ม Action: `"กดรับคิว / จองเวลา"` (Full-width Primary Button)

---

### Screen C2: First-Time Profile Binding (หน้าลงทะเบียนสมาชิกครั้งแรกใน LINE)
- **Purpose:** ลูกค้าเข้าใช้งานครั้งแรก ระบบดึง LINE ให้โดยอัตโนมัติ ให้กรอกเบอร์โทรและชื่อเล่นครั้งเดียว
- **Layout:** Centered Clean Card บนพื้นหลัง Gradient นุ่มนวล
- **Components:**
  - รูป Avatar และ Display Name ที่ดึงมาจาก LINE พร้อม Badge `"เชื่อมต่อกับ LINE สำเร็จ"`
  - ข้อความอธิบาย: *"กรอกข้อมูลเพียงครั้งเดียว เพื่อใช้จองคิวทุกร้านได้ทันที"*
  - ช่องกรอกข้อมูล:
    1. **ชื่อเล่น / ชื่อเรียกหน้าร้าน (Nickname):** เช่น "คุณกอล์ฟ"
    2. **เบอร์โทรศัพท์มือถือ (Phone):** ใส่ตัวเลข 10 หลัก
  - Checkbox: ยอมรับเงื่อนไขการให้บริการ
  - ปุ่ม CTA: `"ยืนยันข้อมูลและเริ่มจองคิว"` (ปุ่มใหญ่ สีเขียว LINE `#06C755`)

---

### Screen C3: Shop Queue Booking (หน้าเลือกประเภทคิว Walk-in หรือจองรอบเวลา)
- **Header:**
  - ปุ่มย้อนกลับ `<`
  - ข้อมูลร้านค้า: ชื่อร้าน, ที่อยู่, เวลาทำการวันนี้
  - Badge สถานะร้าน: `"เปิดให้บริการ"`
- **Segmented Control (Tab สลับ 2 โหมด):**
  - Tab 1: **"รับคิวสดหน้าร้าน (Walk-in)"**
  - Tab 2: **"จองรอบเวลาวันนี้ (Same-Day Slot)"**
- **Content เมื่อเลือก Tab 1 (Walk-in):**
  - การ์ดเลือกประเภทคิว (Queue Category Cards):
    - การ์ด A: โต๊ะ 1-2 ท่าน (มีคิวรอ 3 คิว, รอ ~15 นาที)
    - การ์ด B: โต๊ะ 3-4 ท่าน (มีคิวรอ 1 คิว, รอ ~5 นาที)
    - การ์ด C: โต๊ะใหญ่ 5 ท่านขึ้นไป (ไม่มีคิวรอ)
  - ช่องเลือกจำนวนคน (Stepper `[-] 2 [+]`)
  - ปุ่ม CTA: `"กดรับบัตรคิว Walk-in"`
- **Content เมื่อเลือก Tab 2 (Same-Day Slot):**
  - ข้อความกำกับ: *"รอบเวลาสำหรับการนัดหมายวันนี้เท่านั้น"*
  - Grid รายการช่วงเวลา (Time Slot Chips):
    - `10:30 - 11:00` (ว่าง 2 ที่) - [เลือกได้]
    - `11:00 - 11:30` (เต็มแล้ว) - [Disabled สีเทา]
    - `13:00 - 13:30` (ว่าง 3 ที่) - [เลือกได้]
  - ปุ่ม CTA: `"ยืนยันการจองรอบเวลานี้"`
- **Closed Shop State (กรณีร้านปิด):**
  - แสดงภาพประกอบร้านปิด + ป้ายแบนเนอร์สีแดง/เทา: *"ขณะนี้ร้านปิดให้บริการรับคิวชั่วคราว"* และปุ่มกดรับคิวจะถูก Disabled

---

### Screen C4: Live Ticket Tracking (หน้าบัตรคิวสดใน LINE / Mobile Tracking)
- **Purpose:** ลูกค้าเปิดดูสถานะคิวสดของตัวเอง มีเสียงเตือนและเปลี่ยนสีเมื่อถึงคิว
- **Top Bar:**
  - ชื่อร้านค้า + วันที่วันนี้
  - ปุ่ม "แชร์ / คัดลอกลิงก์บัตรคิว" (Icon Copy Link)
- **Ticket Hero Card (บัตรคิวดิจิทัล):**
  - **หมายเลขคิวขนาดใหญ่พิเศษ:** `A-012`
  - ประเภทคิว: "โต๊ะ 1-2 ท่าน (2 คน)"
  - **Badge สถานะ:**
    - ปกติ: `"กำลังรอคิว (WAITING)"` (สีฟ้า)
    - เมื่อถูกเรียก: `"ถึงคิวของคุณแล้ว! กรุณาติดต่อเคาน์เตอร์"` (การ์ดเปลี่ยนเป็นสีเขียวมรกตเรืองแสง + กะพริบ)
- **Live Queue Counter:**
  - วงกลมตัวเลขหรือแถบ Progress: `"เหลืออีก 2 คิวข้างหน้า"`
  - เวลาที่รอโดยประมาณ: `"~ 10 นาที"`
  - ลำดับคิวปัจจุบันที่กำลังให้บริการ: `"ปัจจุบันกำลังเรียก: A-010"`
- **Sound Indicator:**
  - ไอคอนลำโพงเปิดอยู่ `"ระบบเปิดเสียงเตือนอัตโนมัติเมื่อถึงคิว"`
- **Footer Actions:**
  - ปุ่มรอง: `"ยกเลิกคิวนี้"` (ตัวหนังสือสีแดง พร้อมป๊อปอัปยืนยัน)

---

## 3. Merchant Flow Screens (Tablet / Responsive Desktop)

### Screen M1: Merchant Onboarding & Application (หน้าสมัครเปิดร้านค้า)
- **Layout:** Form wizard สะอาดตา
- **Fields:**
  - ข้อมูลร้าน: ชื่อร้านค้า, หมวดหมู่ธุรกิจ (Dropdown), ที่อยู่, จังหวัด/พื้นที่ให้บริการ
  - ข้อมูลเจ้าของร้าน: ชื่อ-นามสกุล, เบอร์โทรติดต่อ, LINE ID
  - เอกสารยืนยันร้านค้า: อัปโหลดรูปป้ายหน้าร้าน หรือรูปบรรยากาศร้าน
- **Application Submitted View:**
  - ไอคอนนาฬิกาทราย `"ส่งใบสมัครเรียบร้อยแล้ว"`
  - ข้อความ: *"ระบบอยู่ระหว่างรอการตรวจสอบและอนุมัติจากแอดมิน เพื่อยืนยันพื้นที่ให้บริการ"*
  - ติดต่อซัพพอร์ต / แอดมิน

---

### Screen M2: Merchant Dashboard Header & Global Controls (แถบควบคุมหลัก)
- **Header Elements:**
  - โลโก้และชื่อร้าน
  - **สวิตช์หลัก "เปิดร้าน / ปิดร้าน" (Store Open/Close Toggle):**
    - สีเขียว: `● เปิดร้าน (รับคิวและแสดงผลบน LINE)`
    - สีเทา/แดง: `○ ปิดร้าน (ซ่อนจากหน้าแรกและหยุดรับคิว)`
  - **ปุ่มเปิดรับการแจ้งเตือน (Web Push):**
    - ปุ่มกระดิ่ง: `"เปิดแจ้งเตือนคิวใหม่บนอุปกรณ์นี้"`
  - **ปุ่มทดสอบเสียงเตือน (Test Sound):** เสียง "ติ๊งหน่อง 🔔"

---

### Screen M3: Live Call Board (หน้าจอเรียกคิวสดหน้าร้าน)
- **Layout:** แยกเป็น 2 คอลัมน์ (สำหรับจอ iPad / Tablet แนวนอน)
  - **คอลัมน์ซ้าย: แผงควบคุมการเรียกคิวปัจจุบัน (Active Calling Panel)**
    - หมายเลขคิวที่กำลังเรียกอยู่: `A-011` (ขนาดใหญ่)
    - ปุ่ม Action หลัก (ขนาดใหญ่ กดง่ายด้วยนิ้ว):
      - **[เรียกคิวถัดไป (Call Next)]** (ปุ่มสีเขียวเด่นสุด)
      - **[เรียกซ้ำ (Recall 🔔)]** (ส่งสัญญาณเตือนไปมือถือลูกค้าอีกรอบ)
      - **[เริ่มให้บริการ (Serve)]** (เปลี่ยนสถานะเป็นให้บริการ)
      - **[เสร็จสิ้น (Complete)]** (ปิดคิวนี้)
      - **[ข้ามคิว / พักคิว (Skip)]** (ย้ายไปแถวพักคิว)
  - **คอลัมน์ขวา: รายการคิวรอแยกตามประเภท (Queue Waiting Lists)**
    - แท็บสลับประเภท: `โต๊ะ 1-2 คน (4)`, `โต๊ะ 3-4 คน (2)`, `รอบเวลาวันนี้ (3)`
    - การ์ดรายการคิว: หมายเลขคิว, ชื่อลูกค้า, เบอร์โทร, จำนวนคน, เวลารอ
    - การ์ดคิวที่ถูกพักไว้ (Skipped List) สามารถกดปุ่ม `"ดึงกลับมาเรียกใหม่"` ได้
- **New Ticket Alert Overlay:**
  - เมื่อมีคิวใหม่เข้ามา: หน้าจอมีแถบสีเหลือง-เขียวกะพริบด้านบน + เล่นเสียง "ติ๊งหน่อง 🔔" + มี Web Push เด้งขึ้นที่เครื่อง

---

### Screen M4: Shop Setup & QR Code Generator (หน้าตั้งค่าและพิมพ์ QR หน้าร้าน)
- **Section 1: จัดการประเภทคิว (Queue Categories)**
  - ตารางแสดงประเภทคิว: รหัสนำหน้า (A, B, C), ชื่อเรียก, จำนวนคน, เวลารอเฉลี่ย
  - ปุ่ม `+ เพิ่มประเภทคิวใหม่`
- **Section 2: จัดการรอบเวลานัดหมาย (2-Day Time Slots)**
  - รายการรอบเวลา: `10:00 - 10:30 (รับ 3 คิว)`, `10:30 - 11:00 (รับ 3 คิว)` ...
  - สวิตช์เปิด/ปิดแต่ละรอบเวลา (ใช้สำหรับเปิดให้จองทั้งรอบของวันนี้และวันพรุ่งนี้)
- **Section 3: พิมพ์ป้าย QR Code หน้าร้าน (Print QR Standee)**
  - แสดงตัวอย่างใบโปสเตอร์พร้อมพิมพ์ (ขนาด A4/A5)
  - มีโลโก้ร้าน + QR Code ขนาดใหญ่สำหรับสแกนเข้า LINE LIFF + ข้อความ *"สแกนเพื่อรับคิวผ่าน LINE ได้ทันที ไม่ต้องโหลดแอป"*
  - ปุ่ม `"พิมพ์ใบ QR Code"`

---

## 4. Admin Flow Screens (Desktop / Tablet)

### Screen A1: Admin Approval Dashboard (หน้าพิจารณาอนุมัติร้านค้าใหม่)
- **Top Stats:**
  - ร้านค้ารออนุมัติ (`Pending`), ร้านค้าเปิดใช้งานอยู่ (`Active`), ร้านค้าปิดร้านอยู่ (`Closed`)
- **Approval Queue Table:**
  - คอลัมน์: วันที่สมัคร, ชื่อร้าน, หมวดหมู่, จังหวัด/พื้นที่, เจ้าของร้าน, เบอร์ติดต่อ, รูปภาพหน้าร้าน
  - Action Buttons:
    - ปุ่มสีเขียว: **"อนุมัติ (Approve)"**
    - ปุ่มสีแดง: **"ปฏิเสธ (Reject)"** (เปิด Modal ให้ใส่เหตุผล เช่น ไม่อยู่ในพื้นที่ให้บริการ)

---

### Screen A2: Platform Directory & "Manage as Shop" (หน้ารายชื่อร้านและการเข้าควบคุม)
- **Shop Directory Table:**
  - แสดงรายชื่อร้านค้าทั้งหมดในระบบ
  - สถานะ: `APPROVED`, `PENDING`, `REJECTED`, `SUSPENDED`
  - สถานะเปิด/ปิดร้าน: `OPEN` / `CLOSED`
  - คิวรวมของวันนี้
- **Key Feature - ปุ่ม "เข้าจัดการร้านค้านี้ (Manage as Shop)":**
  - คลิกเพื่อสลับหน้าจอเข้าไปยัง Merchant Dashboard ของร้านนั้น ๆ ทันที
  - มีแบนเนอร์แจ้งเตือนด้านบนว่า: *"คุณกำลังจัดการระบบในฐานะแอดมินสำหรับร้าน [ชื่อร้าน] [กดเพื่อกลับหน้าแอดมิน]"*
  - ช่วยให้แอดมินแก้ไขปัญหา, ตั้งค่ารอบเวลา หรือเคลียร์คิวให้ร้านค้าได้อย่างรวดเร็ว

---

## 5. Screen Summary Matrix for Google Stitch

| Screen ID | Screen Name | Target Persona | Viewport / Form Factor | Key Components |
|:---|:---|:---|:---|:---|
| **C1** | Home & Open Store Directory | Customer | Mobile (390x844) | Header, Active Ticket Sticky Banner, Search/Category Pills, Open Store Cards, Real-time queue count |
| **C2** | First-Time Profile Setup | Customer | Mobile (390x844) | LINE Avatar & Name prefilled, Nickname input, Phone input, Single submit button |
| **C3** | Shop Queue Booking | Customer | Mobile (390x844) | Tabs (Walk-in vs 2-Day Slot), Category Cards, Stepper, Date selector (วันนี้/พรุ่งนี้), Slot Grid, Closed Store View |
| **C4** | Live Ticket Tracking | Customer | Mobile (390x844) | Giant Ticket Number, Status Aura Badge, Countdown/Queue ahead, Audio alert icon, Copy link |
| **M1** | Merchant Onboarding Form | Merchant | Tablet / Desktop | Multi-step form, Shop info, Area/Province, Approval Pending status view |
| **M2** | Merchant Header Controls | Merchant | Tablet (1024x768) | Open/Close Toggle, Web Push subscribe bell, Sound test button |
| **M3** | Live Call Board | Merchant | Tablet / Desktop | Active Calling Card (Call Next, Recall, Serve, Complete, Skip), Category Queue Lists, Sound alert popup |
| **M4** | Shop Settings & QR Print | Merchant | Desktop / Tablet | Category editor, 2-day time slot table, Print-ready A4 QR standee preview |
| **A1** | Admin Shop Approval | Admin | Desktop (1440x900) | Pending shops list, Province filter, Approve/Reject modal |
| **A2** | Admin Shop Directory & Impersonation | Admin | Desktop (1440x900) | Full shop list, Open/Close status, "Manage as Shop" switch action |
