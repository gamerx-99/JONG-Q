# Jong-Q: Generic Queue Booking Platform - Design Specification

**Status:** Draft / Pending Review  
**Date:** 2026-09-14  
**Author:** Antigravity & User  
**Target Path:** `docs/superpowers/specs/2026-09-14-jong-q-design.md`

---

## 1. Overview & Vision

**Jong-Q (จองคิว)** เป็นแพลตฟอร์มระบบจองคิวอเนกประสงค์ (Generic Multi-Tenant Queue Booking Platform) ที่ออกแบบมาเพื่อรองรับธุรกิจหลากหลายประเภท (เช่น ร้านอาหาร, คลินิก, ร้านตัดผม/เสริมสวย, ศูนย์บริการ)

### จุดเด่นเชิงกลยุทธ์ (Core Pillars):
1. **LINE-First Customer Experience:** ออกแบบให้ลูกค้าใช้งานผ่าน **LINE LIFF** ได้อย่างราบรื่น ไม่ต้องสลับเบราว์เซอร์ ไม่ต้องดาวน์โหลดแอปใหม่ ดึงข้อมูลโปรไฟล์จาก LINE ทันที กรอกเบอร์โทรและชื่อเล่นเพียงครั้งเดียว
2. **Zero-Push Policy for Customers (ประหยัดค่าบริการ 100%):** ไม่มีการส่งข้อความ Push หาลูกค้าล่วงหน้าผ่าน LINE Messaging API (ป้องกันโควต้าหมดและค่าใช้จ่ายส่วนเกิน) ลูกค้าสามารถติดตามคิวสดผ่านหน้าเว็บ (Live Web Tracking) หรือเปิดดูผ่านลิงก์บัตรคิวและ Rich Menu ใน LINE ได้ตลอดเวลา
3. **2-Day Rolling Hybrid Queueing (ระบบจอง 2 วัน: วันนี้ + พรุ่งนี้):**
   - **คิวสดหน้าร้าน (Walk-in):** รับคิวและให้บริการแบบวันต่อวัน (Same-Day) ลำดับหมายเลขคิวรันและรีเซ็ตใหม่ทุกวัน (A-001, B-001)
   - **การจองรอบเวลา (Time-Slot Appointment):** รองรับการจองได้ **2 วัน (วันนี้ + พรุ่งนี้ เท่านั้น)** ลูกค้าสามารถเลือกจองรอบเวลาของ "วันนี้" หรือจองล่วงหน้าสำหรับ "วันพรุ่งนี้" ช่วยให้วางแผนล่วงหน้าได้ 1 วัน โดยไม่เกิดปัญหาการจองข้ามสัปดาห์/เดือนที่เสี่ยงต่อการทิ้งคิว
   - เมื่อข้ามวัน คิวรอบของเมื่อวานจะสรุปยอดปิดรอบ และวันพรุ่งนี้จะกลายเป็นรอบวันนี้โดยอัตโนมัติ
4. **Cost-Free Merchant Alerts:** แจ้งเตือนร้านค้าเมื่อมีคิวใหม่ด้วย **Web Push Notification (ฟรี 100%)** เด้งบนจอมือถือ/แท็บเล็ต พร้อมสัญญาณเสียงกริ่ง **Audio Chime** หน้าร้าน
5. **Admin Supervision & Shop Management:** แอดมินระบบสามารถตรวจสอบ อนุมัติ/ปฏิเสธร้านค้าใหม่ (กรองพื้นที่บริการ) และสามารถ "สลับเข้าจัดการระบบของร้านค้านั้นๆ (Manage as Shop)" เพื่อช่วยเหลือและตรวจสอบได้โดยตรง
6. **Store Open/Close Control & Directory Filtering:** ร้านค้ามีระบบสวิตช์ **"เปิด / ปิดร้าน"** ที่หน้า Dashboard เมื่อร้านกดเปิด ร้านจะปรากฏในหน้าแรกของเว็บและในเมนูค้นหาร้านบน LINE โดยระบบจะ **แสดงรายการเฉพาะร้านที่เปิดอยู่เท่านั้น** เพื่อป้องกันลูกค้าจองคิวผิดเวลาร้านปิด

---

## 2. Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Jong-Q Web Platform                           │
│                      (Next.js App Router + TypeScript)                  │
├──────────────────────────┬────────────────────────┬─────────────────────┤
│   /(customer) [LIFF]     │  /(merchant) [Portal]  │   /(admin) [Portal] │
│ - สแกน QR / เปิดใน LINE   │ - รับสมัครร้านค้า       │ - อนุมัติร้านค้าใหม่   │
│ - รับคิวสด / จองเวลารอบ  │ - หน้าเรียกคิวสดหน้าร้าน│ - จัดการระบบทุกร้าน │
│ - Live Ticket Tracking   │ - Web Push + เสียงเตือน │ - สถิติภาพรวมระบบ   │
└────────────┬─────────────┴───────────┬────────────┴──────────┬──────────┘
             │                         │                       │
             ▼                         ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend Services & APIs                         │
│ - Server-Sent Events (SSE) Engine: สตรีมลำดับคิวสดไปยังมือถือลูกค้า/ร้าน   │
│ - Web Push Notification Service (VAPID): ส่งแจ้งเตือนคิวใหม่เข้าร้านค้า │
│ - Role-Based Access Control (RBAC): Admin, Merchant, Customer           │
│ - LINE Profile Verification & Auto-binding                              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Persistence Layer                          │
│                   Prisma ORM + SQLite (Dev) / PostgreSQL (Prod)         │
└─────────────────────────────────────────────────────────────────────────┘
```

### รายละเอียดเทคโนโลยี:
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Modern Vanilla CSS / TailwindCSS (Mobile-first, Responsive, Clean aesthetics)
- **Real-time Engine:** **Server-Sent Events (SSE)** สำหรับอัปเดตสถานะคิวไปยังลูกค้าและหน้าเรียกคิวของร้านค้าแบบ Low-latency และเสถียรบน LINE In-App Browser
- **Database & ORM:** SQLite ผ่าน **Prisma ORM** (สำหรับการพัฒนาและทดสอบในเครื่องทันที พร้อมรองรับการ Migrate สู่ PostgreSQL เมื่อขึ้นระบบจริง)
- **Notification API:** Web Push Notifications (มาตรฐาน VAPID/Web Standards ไม่เสียค่าใช้จ่าย) + Web Audio API สำหรับสังเคราะห์และเล่นเสียงเตือน

---

## 3. User Roles & Workflows

### 3.1 ลูกค้า (Customer)
1. **การเข้าถึงระบบและค้นหาร้านค้า:**
   - **เมื่อเปิดผ่าน LINE หรือหน้าแรก (Directory / Browse):** ระบบจะ **แสดงรายการเฉพาะร้านค้าที่ "เปิดร้านอยู่" (isOpen == true และ status == APPROVED) เท่านั้น** ร้านที่ปิดจะไม่ปรากฏให้เห็น เพื่อไม่ให้ลูกค้าสับสน
   - **กรณีสแกน QR Code ตรงหน้าร้าน:** หากร้านนั้นกดปิดร้านอยู่ หน้าจอจะแจ้งชัดเจนว่า *"ขณะนี้ร้านปิดให้บริการรับคิวชั่วคราว"* และปิดปุ่มกดรับคิว
2. **การลงทะเบียนครั้งแรก:** 
   - ระบบดึง Display Name และ User ID จาก LINE อัตโนมัติ
   - แสดงฟอร์มให้กรอก **ชื่อเล่น** และ **เบอร์โทรศัพท์** (ครั้งเดียว บันทึกคู่กับ LINE User ID)
3. **การเลือกบริการ & จองคิว (วันนี้ + พรุ่งนี้ - 2-Day Booking):**
   - **คิวสดหน้าร้าน (Walk-in):** เลือกประเภทคิว (เช่น โต๊ะ 1-2 คน หรือ บริการตัดผม) -> ระบุจำนวนคน -> รับคิวสดของวันนี้ทันที
   - **จองรอบเวลานัดหมาย (Time Slot Appointment):** เลือกระหว่าง **"วันนี้ (Today)"** หรือ **"พรุ่งนี้ (Tomorrow)"** -> เลือกรอบเวลาที่ต้องการ (เช่น 13:00 - 13:30 น.) -> กดยืนยันการจองล่วงหน้า 1 วัน
4. **หน้าบัตรคิวสด (Live Ticket Tracking):**
   - แสดงหมายเลขคิวขนาดใหญ่เด่นชัด (เช่น `A-012`)
   - มีข้อความแสดงสถานะ: *"รออีก 3 คิวข้างหน้า (โดยประมาณ 15 นาที)"*
   - มีปุ่ม **"คัดลอกลิงก์บัตรคิว"** สำหรับเปิดดูภายหลัง
   - เมื่อสถานะเปลี่ยนเป็น `CALLED` (กำลังเรียกคิว): หน้าจอเปลี่ยนเป็นสีเขียวเด่นชัด + มีเสียงเตือน (Chime)
   - หากปิดหน้าจอไป เมื่อกดเข้า LINE Rich Menu ในภายหลัง ระบบจะตรวจจับคิวที่กำลังดำเนินอยู่และแสดงลิงก์กลับมายังบัตรคิวใบนี้ทันที

### 3.2 ร้านค้า (Merchant / Staff)
1. **การสมัครเปิดร้าน (Onboarding):**
   - กรอกข้อมูลร้าน: ชื่อร้าน, หมวดหมู่ธุรกิจ, จังหวัด/พื้นที่ให้บริการ, เบอร์ติดต่อเจ้าของร้าน, เอกสาร/ข้อมูลระบุตัวตน
   - หลังส่งใบสมัคร สถานะร้านจะเป็น `PENDING` (รอแอดมินอนุมัติ)
2. **ระบบสวิตช์เปิด/ปิดร้าน (Open/Close Store Control):**
   - มีปุ่ม Toggle สวิตช์ **"เปิดร้าน / ปิดร้าน"** บน Header ของ Merchant Dashboard
   - **เปิดร้าน (Open):** ร้านจะแสดงในหน้าแรกของเว็บ และแสดงในรายการค้นหาบน LINE ทันที พร้อมรับคิว Walk-in และรอบนัดหมาย
   - **ปิดร้าน (Closed):** ร้านจะถูกซ่อนออกจากหน้ารายการใน LINE และหน้าแรกทันที รวมถึงหยุดรับคิวใหม่ชั่วคราว
3. **การตั้งค่าร้านค้า (เมื่อได้รับอนุมัติแล้ว):**
   - **ประเภทคิว (Queue Categories):** ตั้งรหัสนำหน้า (เช่น A, B, C), จำนวนคนต่อกลุ่ม, เวลาให้บริการโดยประมาณ
   - **ตารางเวลานัดหมาย (Time Slots):** กำหนดช่วงเวลารอบรับจองล่วงหน้า และจำนวนโควต้าสูงสุดต่อรอบ
   - **พิมพ์ QR Code หน้าร้าน:** หน้าพิมพ์เอกสาร QR Code ประจำร้านสำหรับตั้งที่เคาน์เตอร์
   - **การเปิดรับการแจ้งเตือน:** กดปุ่มเปิดสิทธิ์ "Web Push Notification" และทดสอบเสียงเตือนเมื่อมีคิวใหม่
4. **หน้าจัดการคิวสด (Merchant Live Call Board):**
   - แสดงรายการคิวที่กำลังรอ แยกตามประเภท
   - ปุ่มควบคุม:
     - **เรียกคิวถัดไป (Call Next):** ส่งสถานะ `CALLED` ไปยังบัตรคิวของลูกค้า
     - **เรียกซ้ำ (Recall):** สั่งเสียงกระดิ่งเตือนไปยังจอมือถือลูกค้าอีกครั้ง
     - **เริ่มให้บริการ (Serve):** เปลี่ยนสถานะเป็น `SERVING`
     - **เสร็จสิ้น (Complete):** ปิดคิว `COMPLETED`
     - **ข้ามคิว / พักคิว (Skip/Hold):** ย้ายคิวไปอยู่ในรายการพักคิว และสามารถดึงกลับมาเรียกใหม่ได้
   - **แจ้งเตือนคิวใหม่:** หน้าจอกะพริบแจ้งเตือน + เล่นเสียง "ติ๊งหน่อง 🔔" + ยิง Web Push ไปยังเครื่องพนักงานทันที

### 3.3 ผู้ดูแลระบบ (General Admin)
1. **ระบบคัดกรองและอนุมัติร้านค้า (Approval Dashboard):**
   - รายการร้านค้าที่รอการตรวจสอบ (`PENDING`)
   - ตรวจสอบพื้นที่ให้บริการและข้อมูลติดต่อ
   - สิทธิ์กด: **อนุมัติ (Approve)** หรือ **ปฏิเสธ (Reject)** พร้อมระบุเหตุผล
2. **การเข้าจัดการระบบแทนร้านค้า (Manage as Shop / Impersonation):**
   - แอดมินสามารถคลิกเข้าไปดูหน้า Dashboard ของร้านค้าใดก็ได้ เสมือนเป็นเจ้าของร้าน
   - ช่วยร้านค้าตั้งค่าประเภทคิว, แก้ไขรอบเวลา, ตรวจสอบข้อผิดพลาดของคิวหน้าร้านได้ทันที
3. **การบริหารจัดการแพลตฟอร์ม (Platform Directory):**
   - ดูรายชื่อร้านค้าทั้งหมด, สั่งระงับชั่วคราว (Suspend), และดูรายงานสถิติคิวรวมของระบบ

---

## 4. Database Schema (Prisma Data Model)

```prisma
// Enum Definitions
enum Role {
  CUSTOMER
  MERCHANT
  ADMIN
}

enum ShopStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

enum QueueType {
  WALKIN
  APPOINTMENT
}

enum TicketStatus {
  WAITING     // กำลังรอคิว
  CALLED      // พนักงานกดเรียก
  SERVING     // อยู่ระหว่างรับบริการ
  COMPLETED   // บริการเสร็จสิ้น
  SKIPPED     // ลูกค้าไม่แสดงตัว (พักคิวไว้)
  CANCELLED   // ลูกค้ายกเลิกคิว
}

// User Model: ลูกค้า, เจ้าของร้าน, แอดมิน
model User {
  id            String    @id @default(cuid())
  phone         String    @unique
  name          String
  nickname      String?
  lineUserId    String?   @unique
  role          Role      @default(CUSTOMER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  shops         Shop[]    @relation("ShopOwner")
  tickets       Ticket[]
  pushSubscriptions PushSubscription[]
}

// Shop Model: ข้อมูลร้านค้า
model Shop {
  id            String      @id @default(cuid())
  name          String
  slug          String      @unique
  category      String      // e.g. Restaurant, Clinic, Salon, Service
  address       String?
  areaProvince  String      // พื้นที่จังหวัด สำหรับแอดมินคัดกรอง
  phone         String
  status        ShopStatus  @default(PENDING)
  rejectionReason String?
  isOpen        Boolean     @default(true)
  ownerId       String
  owner         User        @relation("ShopOwner", fields: [ownerId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  queueCategories QueueCategory[]
  timeSlots       TimeSlot[]
  tickets         Ticket[]
}

// QueueCategory: ประเภทคิวในร้าน (เช่น A โต๊ะ 1-2 คน, B โต๊ะ 3-4 คน)
model QueueCategory {
  id              String    @id @default(cuid())
  shopId          String
  shop            Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name            String    // เช่น "โต๊ะ 1-2 ท่าน", "ตัดผมชาย"
  prefix          String    // เช่น "A", "B"
  minPartySize    Int       @default(1)
  maxPartySize    Int       @default(2)
  estimatedMinutes Int      @default(15)
  isActive        Boolean   @default(true)
  currentNumber   Int       @default(0) // ตัวเลขคิวล่าสุดประจำวัน
  createdAt       DateTime  @default(now())

  tickets         Ticket[]
}

// TimeSlot: รอบเวลาภายในวัน (Day-by-Day)
model TimeSlot {
  id            String    @id @default(cuid())
  shopId        String
  shop          Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  startTime     String    // เช่น "10:00"
  endTime       String    // เช่น "10:30"
  maxCapacity   Int       @default(3) // โควต้ารับกี่คิวต่อรอบประจำวัน
  isActive      Boolean   @default(true)

  tickets       Ticket[]
}

// Ticket: บัตรคิวประจำวัน (Day-by-Day)
model Ticket {
  id              String        @id @default(cuid())
  queueDate       String        // วันที่ของคิว รูปแบบ "YYYY-MM-DD"
  ticketNumber    String        // เช่น "A-015" (รีเซ็ตใหม่ทุกวัน)
  sequenceNumber  Int           // ลำดับรัน 15
  shopId          String
  shop            Shop          @relation(fields: [shopId], references: [id], onDelete: Cascade)
  categoryId      String
  category        QueueCategory @relation(fields: [categoryId], references: [id])
  userId          String?
  user            User?         @relation(fields: [userId], references: [id])
  
  // ข้อมูลลูกค้า Snapshot ณ เวลาที่จอง
  customerName    String
  customerNickname String?
  customerPhone   String
  partySize       Int           @default(1)

  type            QueueType     @default(WALKIN)
  slotId          String?
  slot            TimeSlot?     @relation(fields: [slotId], references: [id])

  status          TicketStatus  @default(WAITING)
  calledAt        DateTime?
  servedAt        DateTime?
  completedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// PushSubscription: สำหรับ Web Push ฟรีของร้านค้า
model PushSubscription {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint      String    @unique
  p256dhKey     String
  authKey       String
  createdAt     DateTime  @default(now())
}
```

---

## 5. Key API & Real-time Specifications

### 5.1 Real-time Queue Tracking (SSE Engine)
- **Endpoint:** `GET /api/queue/[shopId]/stream`
  - สตรีมสถานะคิวรวมของร้านค้า (คิวปัจจุบัน, คิวที่กำลังเรียก, จำนวนคิวที่รอแต่ละหมวดหมู่) ไปยังหน้าจอหน้าร้านและจอมือถือ
- **Endpoint:** `GET /api/tickets/[ticketId]/stream`
  - สตรีมสถานะของบัตรคิวแต่ละใบโดยเฉพาะ (เมื่อสถานะเปลี่ยนเป็น `CALLED` หรือ `COMPLETED` หน้าจอจะรีเฟรชและส่งเสียงเตือนทันที)

### 5.2 Customer APIs
- `POST /api/customer/sync-line`: ตรวจสอบและบันทึก LINE Profile และส่งคืนข้อมูลผู้ใช้
- `POST /api/customer/book-walkin`: รับคิวสดหน้าร้าน พร้อมออกหมายเลขคิว
- `POST /api/customer/book-appointment`: จองรอบเวลาล่วงหน้า
- `GET /api/customer/active-ticket`: ตรวจหาคิวที่ยังไม่เสร็จสิ้นของผู้ใช้นี้

### 5.3 Merchant APIs
- `POST /api/merchant/register`: สมัครเปิดร้านค้า
- `GET /api/merchant/[shopId]/dashboard`: ดึงข้อมูลคิวสดและการตั้งค่าร้าน
- `POST /api/merchant/[shopId]/call-next`: เรียกคิวถัดไป
- `POST /api/merchant/[shopId]/ticket-action`: จัดการคิว (Recall, Skip, Complete, Cancel)
- `POST /api/merchant/push-subscribe`: ลงทะเบียน Web Push สำหรับรับแจ้งเตือนคิวใหม่

### 5.4 Admin APIs
- `GET /api/admin/pending-shops`: ดูรายการร้านค้ารอการอนุมัติ
- `POST /api/admin/approve-shop`: อนุมัติร้านค้า
- `POST /api/admin/reject-shop`: ปฏิเสธร้านค้า
- `GET /api/admin/shops`: รายการร้านค้าทั้งหมด
- `POST /api/admin/impersonate/[shopId]`: สร้าง Admin Session Token เพื่อเข้าควบคุมร้านค้านั้นๆ (Manage as Shop)

---

## 6. Verification & Testing Plan

1. **LINE & LIFF Simulation:**
   - ทดสอบการเข้าสู่ระบบผ่าน LINE Profile จำลองบน Localhost
   - ทดสอบการจำข้อมูลผู้ใช้โดยไม่ต้องกรอกซ้ำ
2. **Real-time Live Sync:**
   - เปิดหน้า Merchant Call Board ในหน้าต่างที่ 1 และเปิดหน้า Customer Ticket ในหน้าต่างที่ 2
   - เมื่อหน้าร้านกด "เรียกคิว" -> หน้าลูกค้าต้องเปลี่ยนสถานะทันทีภายในเสี้ยววินาที (< 500ms) พร้อมเสียงเตือน
3. **Web Push & Chime Alert:**
   - ทดสอบการจำลองส่งคิวใหม่ -> ตรวจสอบเสียง Chime และ Notification บนเบราว์เซอร์
4. **Admin Approval & Impersonation:**
   - ทดสอบโฟลว์ร้านสมัครใหม่ -> ขึ้นรอใน Admin Dashboard -> Admin อนุมัติ -> ร้านเข้าใช้งานได้
   - ทดสอบปุ่ม Admin "จัดการระบบร้านค้านี้" เพื่อตรวจสอบความถูกต้องของการสลับสิทธิ์

---

## 7. Next Steps

เมื่อเอกสารสถาปัตยกรรม (Design Spec) นี้ได้รับการตรวจรับและอนุมัติจากผู้ใช้แล้ว:
- จะทำการ Commit เอกสาร Spec เข้า Git
- เข้าสู่กระบวนการ **Writing Plans Skill** เพื่อวางแผนการสร้างระบบและแผนการทดสอบแบบทีละขั้นตอนอย่างละเอียดก่อนเริ่มพัฒนาโค้ดจริง
