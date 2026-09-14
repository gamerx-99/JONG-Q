# Jong-Q: Project Development Roadmap (แผนการพัฒนาระบบ)

**Project:** Jong-Q - Generic Multi-Tenant Queue Booking Platform  
**Architecture:** Next.js (App Router) + TypeScript + Prisma (SQLite/PostgreSQL) + SSE + Web Push  
**Key Strategy:** LINE-First LIFF, 2-Day Booking Window (วันนี้ + พรุ่งนี้), Zero Push to Customers, Cost-Free Merchant Alerts, Admin Approval & Impersonation  
**Created Date:** 2026-09-15  

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Jong-Q Development Timeline                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
 🎨 [Phase 0] UI Design (Google Stitch) ──► ใช้ Design.md ออกแบบหน้าจอทั้งหมด
                                    │
 ⚙️ [Phase 1] Foundation & Database     ──► Next.js, Prisma, Tailwind, Schema
                                    │
 🔐 [Phase 2] Auth & User Roles         ──► LINE LIFF Sync, Merchant Onboarding
                                    │
 🏪 [Phase 3] Store & 2-Day Slot Engine ──► สวิตช์เปิด/ปิดร้าน, จัดการรอบเวลา 2 วัน
                                    │
 📱 [Phase 4] Customer Booking & Live   ──► รับคิวสด, จอง 2 วัน, SSE Live Tracking
                                    │
 🔔 [Phase 5] Merchant Call Board & Push──► หน้าเรียกคิว, Web Push ฟรี, เสียงกริ่ง
                                    │
 🛡️ [Phase 6] Admin & Impersonation     ──► อนุมัติร้านค้า, เข้าจัดการแทนร้านค้า
                                    │
 🚀 [Phase 7] E2E Testing & Launch      ──► ทดสอบเสมือนจริง, ซ้อมเปิดใน LINE, Deploy
```

---

## 🎨 Phase 0: UI/UX Prototyping (Google Stitch) *(สถานะปัจจุบัน)*
> **เป้าหมาย:** ออกแบบหน้าตาของแต่ละหน้าจอให้สวยงาม ทันสมัย และตอบโจทย์พฤติกรรมผู้ใช้ก่อนเริ่มเขียนโค้ด
- [x] จัดทำเอกสารสเปกหน้าจอฉบับสมบูรณ์ [Design.md](file:///d:/system%20make/Jong-Q/Design.md)
- [ ] นำเข้า `Design.md` สู่ Google Stitch เพื่อ Render หน้าจอ UI ครบทั้ง 10 หน้าจอหลัก (C1-C4, M1-M4, A1-A2)
- [ ] ตรวจรับแบบหน้าจอ (Design Review) และคัดเลือก Theme / UI Components

---

## ⚙️ Phase 1: Project Foundation & Data Architecture
> **เป้าหมาย:** วางโครงสร้างโปรเจกต์ Next.js, ฐานข้อมูล Prisma, และระบบ Design System เริ่มต้น
- [ ] ติดตั้ง Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- [ ] กำหนด Design Tokens (Palette สีเขียวมรกต, ฟอนต์ Prompt/Kanit, Utility classes)
- [ ] สร้างไฟล์ Schema `prisma/schema.prisma` รองรับ:
  - โมเดล `User`, `Shop`, `QueueCategory`, `TimeSlot`, `Ticket`, `PushSubscription`
- [ ] สร้าง Data Migration และ Mock Data Seeds สำหรับการทดสอบ (ร้านตัวอย่าง, หมวดหมู่คิว, รอบเวลา)

---

## 🔐 Phase 2: Authentication & User Profiles
> **เป้าหมาย:** ระบบจำแนกบทบาทผู้ใช้ และการเชื่อมโยงข้อมูลกับ LINE อัตโนมัติ
- [ ] **Customer (LINE-First):**
  - ติดตั้งและตั้งค่า LINE LIFF SDK
  - ระบบ Auto-fetch LINE Display Name, Picture, และ `userId`
  - ฟอร์มลงทะเบียนครั้งแรก (Screen C2): บันทึกเบอร์โทรและชื่อเล่น
- [ ] **Merchant:**
  - ฟอร์มสมัครเปิดร้านค้า (Screen M1) พร้อมสถานะรอการตรวจสอบ (`PENDING`)
- [ ] **Admin:**
  - ระบบล็อกอินและระบบสิทธิ์ Role-Based Access Control (RBAC)

---

## 🏪 Phase 3: Store Management & 2-Day Booking Engine
> **เป้าหมาย:** ระบบจัดการร้านค้า, สวิตช์เปิด/ปิดร้าน, และการตั้งค่ารอบเวลา 2 วัน
- [ ] **สวิตช์เปิด/ปิดร้าน (Open/Close Store Toggle):**
  - Toggle บน Header ของร้านค้า อัปเดตสถานะ `isOpen` แบบ Real-time
  - ปรับ Query ให้หน้าแรกและหน้ารายการร้านใน LINE แสดงเฉพาะร้านที่เปิดอยู่ (`isOpen == true`)
- [ ] **เครื่องมือจัดการคิวของร้านค้า (Screen M4):**
  - เพิ่ม/แก้ไขหมวดหมู่คิว (Prefix A, B, C, จำนวนคน, เวลารอเฉลี่ย)
  - จัดการรอบเวลา 2 วัน (2-Day Time Slots): กำหนดช่วงเวลา และโควต้ารับต่อรอบ
  - ระบบสร้างป้าย QR Code หน้าร้านแบบ Print-ready (พร้อมพิมพ์ A4/A5)

---

## 📱 Phase 4: Customer Booking & Real-Time Tracking
> **เป้าหมาย:** หน้าจองคิว และหน้าบัตรคิวสดใน LINE ที่อัปเดตแบบเรียลไทม์
- [ ] **หน้าจองคิวร้านค้า (Screen C3):**
  - Tab 1: รับคิวสดหน้าร้าน (Walk-in) รับคิวของวันนี้ทันที
  - Tab 2: จองรอบเวลา 2 วัน (เลือกระหว่าง "วันนี้" หรือ "วันพรุ่งนี้")
  - ระบบปิดรับคิวอัตโนมัติหากร้านกดปิดร้านอยู่
- [ ] **หน้าบัตรคิวสด (Screen C4 - Live Ticket Tracking):**
  - วางระบบ Server-Sent Events (SSE) สตรีมสถานะคิวแบบ Low-latency
  - ตัวนับคิวถอยหลัง: แสดงจำนวนคิวที่เหลือ และเวลารอโดยประมาณ
  - สัญญาณเสียงเตือน (Browser Audio Chime) + การ์ดเรืองแสงสีเขียวเมื่อสถานะเปลี่ยนเป็น `CALLED`
  - ปุ่มคัดลอกลิงก์บัตรคิว และระบบจำคิวอัตโนมัติเมื่อลูกค้าเปิดเข้า LINE ในภายหลัง

---

## 🔔 Phase 5: Merchant Live Call Board & Notification System
> **เป้าหมาย:** หน้าจอควบคุมคิวหน้าร้าน พร้อมระบบแจ้งเตือนฟรีไม่จำกัด
- [ ] **หน้าเรียกคิวสดหน้าร้าน (Screen M3 - Live Call Board):**
  - แผงควบคุม: ปุ่มกดเรียกคิวถัดไป (Call Next), เรียกซ้ำ (Recall), เริ่มบริการ (Serve), เสร็จสิ้น (Complete), ข้ามคิว (Skip)
  - รายการคิวรอแยกตามหมวดหมู่ (โต๊ะเล็ก, โต๊ะใหญ่, คิวรอบเวลา)
  - กล่องคิวที่ถูกพักไว้ (Skipped) พร้อมปุ่มดึงกลับมาเรียกใหม่
- [ ] **ระบบแจ้งเตือนคิวใหม่แบบ Zero-Cost:**
  - ติดตั้ง Service Worker รองรับ Web Push Notification (VAPID) เด้งบนจอมือถือ/แท็บเล็ตของร้าน
  - เสียงสัญญาณกริ่งหน้าร้าน (Audio Alert "ติ๊งหน่อง 🔔") ดังอัตโนมัติเมื่อมีคิวใหม่เข้า

---

## 🛡️ Phase 6: Admin Supervision & "Manage as Shop"
> **เป้าหมาย:** การบริหารจัดการแพลตฟอร์ม และการเข้าช่วยเหลือร้านค้าโดยแอดมิน
- [ ] **หน้าระบบอนุมัติร้านค้า (Screen A1):**
  - ตรวจสอบรายชื่อร้านค้าที่สมัครเข้ามาใหม่
  - กรองพื้นที่/จังหวัด เพื่อตรวจสอบความถูกต้อง
  - ปุ่มกดอนุมัติ (Approve) / ปฏิเสธ (Reject) พร้อมเหตุผล
- [ ] **ระบบ Manage as Shop (Impersonation Engine - Screen A2):**
  - แอดมินสามารถคลิกเข้าสู่หน้า Dashboard ของร้านค้าใดก็ได้ทันที
  - แถบแจ้งเตือนด้านบนระบุสถานะว่ากำลังใช้งานในโหมดแอดมิน
  - สามารถช่วยตั้งค่ารอบเวลา หมวดหมู่คิว หรือเคลียร์คิวให้ร้านค้าได้ทันที

---

## 🚀 Phase 7: Testing, Optimization & Deployment
> **เป้าหมาย:** การทดสอบความถูกต้อง ความเสถียร และเตรียมความพร้อมเปิดใช้งานจริง
- [ ] **Simulated Queue Load Testing:** ทดสอบการจองคิวพร้อมกันหลายอุปกรณ์ และการรับส่งข้อมูลผ่าน SSE
- [ ] **LINE In-App Browser Compatibility:** ทดสอบการทำงานของ Web Audio, LocalStorage, และ Responsive UI ภายในแอป LINE จริง
- [ ] **Database & Environment Setup:**
  - การ Migrate จาก SQLite ไปเป็น PostgreSQL
  - การตั้งค่า Environment Variables (`NEXT_PUBLIC_LIFF_ID`, `VAPID_KEYS`, `DATABASE_URL`)
  - จัดเตรียมคู่มือการตั้งค่า LINE Official Account และ Rich Menu

---

## สรุปสถานะปัจจุบันและขั้นตอนถัดไป (Current Status & Next Actions)
- [x] ออกแบบสถาปัตยกรรมระบบสมบูรณ์ ([2026-09-14-jong-q-design.md](file:///d:/system%20make/Jong-Q/docs/superpowers/specs/2026-09-14-jong-q-design.md))
- [x] อัปเดตกฎการจองเป็น 2 วัน (วันนี้ + พรุ่งนี้)
- [x] จัดทำข้อกำหนดหน้าจอ UI สำหรับ Google Stitch ([Design.md](file:///d:/system%20make/Jong-Q/Design.md))
- [x] จัดทำแผนงานการพัฒนาระบบ ([Roadmap.md](file:///d:/system%20make/Jong-Q/Roadmap.md))
- ⏳ **ขั้นตอนถัดไป:** นำ `Design.md` ไปให้ Google Stitch ออกแบบหน้าจอ เมื่อพร้อมเริ่มเขียนระบบ สามารถเริ่ม Phase 1 ได้ทันที!
