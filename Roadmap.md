# Jong-Q: Project Development Roadmap (แผนการพัฒนาระบบ)

**Project:** Jong-Q - Generic Multi-Tenant Queue Booking Platform  
**Architecture:** Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL (Docker `jongq_dev`) + Telegram Bot (merchant alerts)  
**Key Strategy:** LINE-First LIFF, 2-Day Booking Window (วันนี้ + พรุ่งนี้), Zero Push to Customers, Cost-Free Merchant Alerts, Admin Approval & Impersonation  
**Created Date:** 2026-09-15 · **Status updated:** 2026-10-16 (checked against the code)  

> **Decisions since the original plan (2026-10-15):**
> - UI style = **A: Risograph / Indie Zine** adjusted per audience (Design.md §1). The emerald palette below is superseded.
> - Database = **PostgreSQL in Docker from day one** (no SQLite step).
> - Merchant alerts = **Telegram bot** (`@jong_q_bot`, working). Web Push (VAPID) is optional/undecided.
> - Customer notification = **one LINE reply at booking** (reply token, free) with a link to the live ticket page `/t/[id]`. No message when the queue is called.
> - LINE LIFF/Login is **deferred until a domain exists**; `/dev-login` stands in locally.

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

## 🎨 Phase 0: UI/UX Prototyping (Google Stitch) — 🟡 partial
> **เป้าหมาย:** ออกแบบหน้าตาของแต่ละหน้าจอให้สวยงาม ทันสมัย และตอบโจทย์พฤติกรรมผู้ใช้ก่อนเริ่มเขียนโค้ด
- [x] จัดทำเอกสารสเปกหน้าจอฉบับสมบูรณ์ [Design.md](Design.md)
- [ ] นำเข้า `Design.md` สู่ Google Stitch เพื่อ Render หน้าจอ UI ครบทั้ง 10 หน้าจอหลัก (C1-C4, M1-M4, A1-A2) *(มี mockup 8 แบบใน `UI/`)*
- [x] ตรวจรับแบบหน้าจอ (Design Review) และคัดเลือก Theme / UI Components → สไตล์ A Risograph (2026-10-15)

---

## ⚙️ Phase 1: Project Foundation & Data Architecture — ✅ done
> **เป้าหมาย:** วางโครงสร้างโปรเจกต์ Next.js, ฐานข้อมูล Prisma, และระบบ Design System เริ่มต้น
- [x] ติดตั้ง Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- [x] กำหนด Design Tokens (~~Palette สีเขียวมรกต~~ → Risograph tokens `canvas-*`, `riso-*`, ฟอนต์ Prompt + Mali `font-zine`, `.riso-*` utilities)
- [x] สร้างไฟล์ Schema `prisma/schema.prisma` รองรับ:
  - โมเดล `User`, `Shop`, `QueueCategory`, `TimeSlot`, `Ticket`, `AdminLog` *(ไม่มี `PushSubscription` เพราะใช้ Telegram)*
- [x] Docker PostgreSQL + Mock Data Seed (ร้าน The Barbershop MHS-01, หมวดคิว A/B/C, รอบเวลา 2 วัน) *(seed ล้างทุกตาราง และรันได้เฉพาะ DB ในเครื่อง)*

---

## 🔐 Phase 2: Authentication & User Profiles — 🟡 LINE deferred
> **เป้าหมาย:** ระบบจำแนกบทบาทผู้ใช้ และการเชื่อมโยงข้อมูลกับ LINE อัตโนมัติ
- [ ] **Customer (LINE-First):**
  - [ ] ติดตั้งและตั้งค่า LINE LIFF SDK *(รอโดเมน)*
  - [ ] ระบบ Auto-fetch LINE Display Name, Picture, และ `userId` *(รอโดเมน)*
  - [x] ฟอร์มลงทะเบียนครั้งแรก (Screen C2 `/profile`): บันทึกเบอร์โทรและชื่อเล่น
- [x] **Merchant:**
  - [x] ฟอร์มสมัครเปิดร้านค้า (Screen M1 `/apply`) พร้อมสถานะรอการตรวจสอบ (`PENDING`)
- [ ] **Admin:**
  - [x] ระบบสิทธิ์ Role-Based Access Control (signed-cookie session, `requireUser()`)
  - [ ] ระบบล็อกอินจริง *(ตอนนี้ใช้ `/dev-login` เฉพาะ dev)*

---

## 🏪 Phase 3: Store Management & 2-Day Booking Engine — 🟡 partial
> **เป้าหมาย:** ระบบจัดการร้านค้า, สวิตช์เปิด/ปิดร้าน, และการตั้งค่ารอบเวลา 2 วัน
- [x] **สวิตช์เปิด/ปิดร้าน (Open/Close Store Toggle):**
  - [x] Toggle บน Header ของหน้าเรียกคิว (`/merchant/[code]/board`) อัปเดต `isOpen` *(ฟอร์มส่งสถานะที่ต้องการ กดซ้ำไม่สลับกลับ)*
  - [x] ปรับ Query ให้หน้าแรกและหน้ารายการร้านใน LINE แสดงเฉพาะร้านที่เปิดอยู่ (`isOpen == true`)
- [x] **เครื่องมือจัดการคิวของร้านค้า (Screen M4 `/merchant/[code]/settings`) — 2026-10-16:**
  - [x] เพิ่ม/แก้ไข/ลบหมวดหมู่คิว (Prefix A/B/C, ชื่อ, จำนวนคน `people`, เวลารอเฉลี่ย) — ลบไม่ได้ถ้ายังมีคิว
  - [x] จัดการรอบเวลา 2 วัน (2-Day Time Slots): เพิ่มช่วงเวลา (สร้างพร้อมกันทั้ง 2 วัน), ตั้งโควต้า (`maxSlots`) ใช้ร่วมทั้ง 2 วัน, สวิตช์เปิด/ปิด (ใช้ทั้ง 2 วัน) + ดูจำนวนที่ว่างของแต่ละวัน
  - [x] ป้าย QR Code หน้าร้านแบบ Print-ready (`/merchant/[code]/qr`) ขนาด A4/A5 (`qrcode` lib, ชี้ไปที่ `/shop/[code]`)
  - [x] หน้า `/shop/[code]` รู้จัก `TimeSlot.enabled` (ปิดแล้วไม่แสดง/จองไม่ได้) + แสดงจำนวนคนของหมวด
  - [x] **P0 fix — หน้าต่าง 2 วันเลื่อนเอง** `ensureTimeSlotWindow(shopId)` (`src/lib/booking-window.ts`): ถ้าสล็อตของวันนี้/พรุ่งนี้หาย ให้ copy วันล่าสุดที่ยังมีอยู่มาสร้าง (idempotent, `skipDuplicates`) เรียกทุกครั้งที่เปิด settings หรือ `/shop/[code]` → พรุ่งนี้จองได้เสมอโดยไม่ต้องกดเพิ่มรอบเองทุกเช้า
  - [x] **P1 fix — `editSlot` แบบ atomic:** เงื่อนไข `currentBooked <= maxSlots` อยู่ใน `WHERE` ของ `updateMany` กันคนจองแทรกแล้วค่าต่ำกว่าที่จองไว้ (เดิมเป็น check-then-update)
  - [x] **P1 fix — ข้อความ `addSlot` แยกกรณี:** `duplicate` (มีอยู่แล้วทั้ง 2 วัน = ปกติ) / `partial` (สร้างได้ครึ่งเดียว = เตือน)
  - [x] **P1 fix — ล็อก prefix เมื่อมีคิวแล้ว** (`readOnly`) กันเลขคิวเก่าเกาะผิดหมวด
  - [x] **ตรวจสอบ:** `npx tsx scripts/check-slot-window.ts` — ยืนยันว่าหน้าต่างซ่อมตัวเอง/idempotent และ capacity guard ไม่ทำให้สล็อตติดลบ

---

## 📱 Phase 4: Customer Booking & Real-Time Tracking — 🟢 mostly done
> **เป้าหมาย:** หน้าจองคิว และหน้าบัตรคิวสดใน LINE ที่อัปเดตแบบเรียลไทม์
- [x] **หน้ารวมร้าน (Screen C1 `/`):** เฉพาะร้านที่เปิด, ค้นหา, กรองหมวด, แถบคิวที่ค้างอยู่
- [x] **หน้าจองคิวร้านค้า (Screen C3 `/shop/[code]`):**
  - [x] Tab 1: รับคิวสดหน้าร้าน (Walk-in) รับคิวของวันนี้ทันที
  - [x] Tab 2: จองรอบเวลา 2 วัน (เลือกระหว่าง "วันนี้" หรือ "วันพรุ่งนี้")
  - [x] ระบบปิดรับคิวอัตโนมัติหากร้านกดปิดร้านอยู่
  - [ ] ช่องเลือกจำนวนคน (Stepper ตอนกดรับคิว) — เพิ่ม `people` ต่อหมวดแล้ว ยังไม่มี stepper ปรับต่อใบ
- [x] **Booking engine** `src/lib/queue.ts`: one live ticket per customer, กันจองเกินโควต้า, ออกเลขคิวแบบล็อกแถวหมวด (`FOR UPDATE`) กันเลขชนเมื่อจองพร้อมกัน (ตรวจด้วย `npx tsx scripts/check-booking-race.ts`), แจ้ง Telegram, LINE reply ครั้งเดียว
- [ ] **หน้าบัตรคิวสด (Screen C4 `/t/[id]` - Live Ticket Tracking):**
  - [ ] วางระบบ Server-Sent Events (SSE) สตรีมสถานะคิวแบบ Low-latency *(ตอนนี้ refresh ทุก 15 วินาที)*
  - [x] ตัวนับคิว: แสดงจำนวนคิวข้างหน้า และคิวที่กำลังเรียก
  - [ ] สัญญาณเสียงเตือน (Browser Audio Chime) *(การ์ดเปลี่ยนสีเมื่อ `CALLED` ทำแล้ว)*
  - [ ] ปุ่มคัดลอกลิงก์บัตรคิว
  - [x] ระบบจำคิวที่ค้างอยู่ (แถบบนหน้าแรก)

---

## 🔔 Phase 5: Merchant Live Call Board & Notification System — 🟡 partial
> **เป้าหมาย:** หน้าจอควบคุมคิวหน้าร้าน พร้อมระบบแจ้งเตือนฟรีไม่จำกัด
- [x] **หน้าเรียกคิวสดหน้าร้าน (Screen M3 `/merchant/[code]/board`) — 2026-10-16:**
  - แผงควบคุม: ปุ่มกดเรียกคิวถัดไป (Call Next), เรียกซ้ำ (Recall), เริ่มบริการ (Serve), เสร็จสิ้น (Complete), ข้ามคิว (Skip)
  - รายการคิวรอแยกตามหมวดหมู่ (โต๊ะเล็ก, โต๊ะใหญ่, คิวรอบเวลา)
  - กล่องคิวที่ถูกพักไว้ (Skipped) พร้อมปุ่มดึงกลับมาเรียกใหม่
  - ทุก action ของร้านบันทึกลง `AdminLog` (`BOARD_*`) ไว้เป็นหลักฐานเมื่อมีข้อโต้แย้งเรื่องข้ามคิว
  - แท็บ "ทั้งหมด" เรียกคิวเก่าสุดของทั้งร้าน (FIFO เคาน์เตอร์เดียว), แท็บหมวดเรียกเฉพาะหมวดนั้น
- [ ] **ระบบแจ้งเตือนคิวใหม่แบบ Zero-Cost:**
  - [x] Telegram Bot แจ้งร้านทันทีเมื่อมีคิวใหม่ (ทดสอบส่งจริงแล้ว 2026-10-15)
  - [ ] ระบบให้ร้านผูก Telegram เอง (`Shop.telegramVerifyToken`)
  - [ ] *(ยังไม่ตัดสินใจ)* Service Worker + Web Push (VAPID)
  - [ ] เสียงสัญญาณกริ่งหน้าร้าน (Audio Alert "ติ๊งหน่อง 🔔") ดังอัตโนมัติเมื่อมีคิวใหม่เข้า

---

## 🛡️ Phase 6: Admin Supervision & "Manage as Shop"
> **เป้าหมาย:** การบริหารจัดการแพลตฟอร์ม และการเข้าช่วยเหลือร้านค้าโดยแอดมิน
- [ ] **หน้าระบบอนุมัติร้านค้า (Screen A1 `/admin`):**
  - [x] ตรวจสอบรายชื่อร้านค้าที่สมัครเข้ามาใหม่
  - [x] กรองจังหวัด (เพิ่ม `Shop.province` + `src/lib/thai-provinces.ts` 77 จังหวัด) เพื่อตรวจสอบความถูกต้อง
  - [x] ปุ่มกดอนุมัติ (Approve) / ปฏิเสธ (Reject) + AdminLog
  - [x] ช่องเหตุผลตอนปฏิเสธ (บังคับเฉพาะตอน reject, เก็บลง `AdminLog.details`) — อนุมัติยังคลิกเดียวจบ
- [x] **ระบบ Manage as Shop (Impersonation Engine - Screen A2 `/admin/shops`) — 2026-10-16:**
  - แอดมินเห็นร้านทั้งหมด พร้อมสถานะ/เปิด-ปิด/จำนวนคิวรอวันนี้ (นับด้วย `getBangkokDate(0)`) + ค้นหาและกรองตามสถานะ
  - ปุ่ม "เข้าจัดการร้านนี้" → `startImpersonation()` แล้วเข้า `/merchant/[code]/board` ของร้านนั้น
  - แถบเตือนด้านบน (`ImpersonationBanner`) แบบ full-bleed sticky แสดงบน board/settings/qr เฉพาะตอนเป็นโหมดแอดมิน
  - **ไม่สลับ session userId** — ใช้ cookie `jq_impersonate` แยก (`<adminId>.<shopId>.<hmac>`, 1 ชม., httpOnly) เพราะการสลับ userId จะทำให้ `AdminLog.adminId` บันทึกเป็นร้านค้าแทนแอดมิน และทำลาย audit trail
  - ทุกการกระทำของแอดมินบันทึก `IMPERSONATE_START` / `IMPERSONATE_STOP`; `board/page.tsx` ใช้ `user.id` อยู่แล้ว จึงบันทึกผู้กระทำจริงเสมอ
  - ปุ่ม "ออกจากโหมดร้าน" เรียก `stopImpersonation()`

---

## 🚀 Phase 7: Testing, Optimization & Deployment
> **เป้าหมาย:** การทดสอบความถูกต้อง ความเสถียร และเตรียมความพร้อมเปิดใช้งานจริง
- [ ] **Simulated Queue Load Testing:** ทดสอบการจองคิวพร้อมกันหลายอุปกรณ์ และการรับส่งข้อมูลผ่าน SSE
- [ ] **LINE In-App Browser Compatibility:** ทดสอบการทำงานของ Web Audio, LocalStorage, และ Responsive UI ภายในแอป LINE จริง
- [ ] **Database & Environment Setup:**
  - [x] ~~การ Migrate จาก SQLite ไปเป็น PostgreSQL~~ (ใช้ PostgreSQL ตั้งแต่ต้น)
  - การตั้งค่า Environment Variables (`NEXT_PUBLIC_LIFF_ID`, `VAPID_KEYS`, `DATABASE_URL`)
  - จัดเตรียมคู่มือการตั้งค่า LINE Official Account และ Rich Menu

---

## สรุปสถานะปัจจุบันและขั้นตอนถัดไป (Current Status & Next Actions)
- [x] ออกแบบสถาปัตยกรรมระบบสมบูรณ์ ([2026-09-14-jong-q-design.md](file:///d:/system%20make/Jong-Q/docs/superpowers/specs/2026-09-14-jong-q-design.md))
- [x] อัปเดตกฎการจองเป็น 2 วัน (วันนี้ + พรุ่งนี้)
- [x] จัดทำข้อกำหนดหน้าจอ UI สำหรับ Google Stitch ([Design.md](file:///d:/system%20make/Jong-Q/Design.md))
- [x] จัดทำแผนงานการพัฒนาระบบ ([Roadmap.md](file:///d:/system%20make/Jong-Q/Roadmap.md))
- [x] Phase 1 เสร็จ, Phase 2 เสร็จยกเว้น LINE, Phase 3 (M4) เสร็จ, Phase 4 ลูกค้าจองคิวได้ครบ flow, **Phase 6 (A1+A2) เสร็จ**
- ⏳ **ขั้นตอนถัดไป (เรียงตามสิ่งที่ขวางการใช้งานจริง):**
  1. ~~Screen M3 หน้าเรียกคิว~~ ✅ 2026-10-16 (+ สวิตช์เปิด/ปิดร้าน)
  2. ~~Screen M4 ตั้งหมวดคิวและรอบเวลา + QR~~ ✅ 2026-10-16 (+ P0 fix หน้าต่าง 2 วันเลื่อนเอง)
  3. ~~A1 อนุมัติร้าน (กรองจังหวัด + เหตุผลปฏิเสธ)~~ ✅ 2026-10-16
  4. ~~A2 Manage as Shop (Impersonation)~~ ✅ 2026-10-16
  5. **SSE + เสียงเตือน** — ลูกค้าเปิด `/t/[id]` แล้วต้องเห็นสถานะสด (ตอนนี้ refresh ทุก 15 วินาที)
  6. LINE LIFF/Login (Phase 2) — ต้องมีโดเมนก่อน
- 🧪 **ชุดตรวจสอบอัตโนมัติ** `npm run check` (ต้องเปิด dev server ก่อน ยกเว้นสองสคริปต์แรก):
  - `check:booking-race` — จองพร้อมกัน 8 คน ได้เลขไม่ซ้ำ
  - `check:slot-window` — หน้าต่าง 2 วันซ่อมตัวเอง/idempotent + capacity guard
  - `check:impersonation` — ใครเข้าหน้าไหนได้, แบนเนอร์, cookie ปลอม/แก้แล้วใช้ไม่ได้, `enterShop` ตั้ง cookie + log
  - `check:admin-review` — กรองจังหวัด + บังคับเหตุผลตอนปฏิเสธ + อนุมัติคลิกเดียว
- ⚠️ งานตั้งแต่ Phase 1 ยังไม่ได้ commit เข้า git
- ⚠️ งานค้าง: `prisma/migrations/` ยังว่าง (ใช้ `db push` อย่างเดียว), `npm run lint` ยังไม่ได้ตั้งค่า eslint, `QueueCategory` ยังไม่มี `enabled` (บริการที่เลิกทำลบไม่ได้ถ้ามีคิวเก่า), `people` เป็น display-only ไม่กระทบการจอง, `ensureTimeSlotWindow` ยังเขียนระหว่าง render ของหน้า public, `tsconfig.tsbuildinfo` ยังไม่อยู่ใน `.gitignore`
