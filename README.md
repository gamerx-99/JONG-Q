# Jong-Q

แพลตฟอร์มจองคิวหลายร้าน (multi-tenant queue booking) — ลูกค้าจองคิวผ่านหน้าเว็บใน LINE, ร้านเรียกคิวจากแท็บเล็ตหน้าร้าน, แอดมินอนุมัติร้านและเข้าช่วยร้านได้

**Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL (Docker `jongq_dev`) · สไตล์ Risograph / Indie Zine**

---

## ⚠️ สถานะจริง — ยังไม่พร้อมใช้งานจริง

โปรเจกต์นี้อยู่ระหว่างพัฒนา **ยังไม่ deploy และยังไม่ควรรับลูกค้าจริง** ลูกค้าต้องล็อกอินผ่านหน้า `/dev-login` ซึ่งเปิดได้เฉพาะตอน dev เท่านั้น รายการงานที่ยังไม่เสร็จอยู่ท้ายไฟล์นี้และใน [Roadmap.md](Roadmap.md)

### ทำงานได้แล้ว

| ส่วน | เส้นทาง | หมายเหตุ |
|---|---|---|
| รายการร้านที่เปิดอยู่ | `/` | กรองหมวด / ค้นหา / แถบคิวค้างของฉัน |
| จองคิว (walk-in + รอบเวลา 2 วัน) | `/shop/[code]` | กันจองเกินโควตา, กันเลขคิวซ้ำตอนกดพร้อมกัน |
| บัตรคิวสด | `/t/[id]` | ยัง refresh ทุก 15 วินาที (ยังไม่ใช้ SSE) |
| หน้าเรียกคิวหน้าร้าน | `/merchant/[code]/board` | เรียกซ้ำ / เริ่มให้บริการ / เสร็จ / ข้าม พร้อมบันทึกลง `AdminLog` · refresh ทุก 10 วินาที |
| ตั้งค่าร้าน (หมวดคิว + รอบเวลา + QR) | `/merchant/[code]/settings` | ป้าย QR พิมพ์ A5 ได้ที่ `/merchant/[code]/qr` |
| อนุมัติร้าน | `/admin` | กรองจังหวัด, บังคับเหตุผลตอนปฏิเสธ |
| รายชื่อร้านทั้งหมด + เข้าจัดการแทนร้าน | `/admin/shops` | แอดมินเข้าใช้งานแทนร้านได้ 1 ร้านพร้อมกัน |

### ยังไม่ทำ

- **LINE LIFF / LINE Login** — ยังไม่เชื่อม ใช้หน้า `/dev-login` แทน (ต้องมีโดเมนจริงก่อนจึงจะตั้งค่า LIFF ได้)
- **SSE + เสียงเตือน** — บัตรคิวยัง poll ทุก 15 วินาที ไม่มีเสียงกริ่งเมื่อถูกเรียก
- **ปุ่มยกเลิกคิว / คัดลอกลิงก์** บนหน้าบัตรคิว
- **`QueueCategory.enabled`** — ยังไม่มี บริการที่เลิกทำแล้วแต่มีคิวเก่า จะลบหรือปิดไม่ได้
- **`people` เป็นตัวเลขแสดงผลอย่างเดียว** — หนึ่งบิตคิว = หนึ่งคนเสมอ ไม่ได้ทำให้จองได้หลายคน
- **ร้านผูก Telegram เอง** (`Shop.telegramVerifyToken`) — ปัจจุบันต้องใส่ chat id เอง
- **`npm run lint`** — ยังไม่ได้ตั้งค่า eslint (ค้างที่หน้าตั้งค่าแบบ interactive)

---

## เริ่มใช้งาน

ต้องมี Node 18+ และ Docker

```bash
cp .env.example .env          # แก้ DATABASE_URL และ AUTH_SECRET ถ้าจำเป็น
npm install
npm run db:up                 # ยก PostgreSQL (container: jongq_dev)
npm run prisma:push           # สร้างตาราง
npm run prisma:seed           # ⚠️ ล้างทุกตาราง ใช้กับฐานข้อมูลในเครื่องเท่านั้น
npm run dev                   # http://localhost:3000
```

เข้า `/dev-login` แล้วเลือกบัญชีตัวอย่างเป็น ลูกค้า / ร้านค้า / แอดมิน (seed สร้างไว้ให้)

### ตรวจสอบว่ายังไม่พัง

```bash
npm run check                 # ต้องเปิด dev server ค้างไว้ (ยกเว้นสองสคริปต์แรก)
```

| คำสั่ง | ตรวจอะไร |
|---|---|
| `check:booking-race` | จองพร้อมกัน 8 คน ได้เลขคิวไม่ซ้ำ |
| `check:slot-window` | หน้าต่าง 2 วันซ่อมตัวเอง/ซ้ำไม่ซ้ำ, ลดโควตาไม่ให้ติดลบ |
| `check:impersonation` | ใครเข้าหน้าไหนได้, cookie ปลอมใช้ไม่ได้, audit ลงชื่อแอดมิน |
| `check:admin-review` | กรองจังหวัด, บังคับเหตุผลปฏิเสธ, อนุมัติคลิกเดียว |
| `check:migration` | migration history รันบนฐานว่างได้จริง และตรงกับ `schema.prisma` (จำลองสิ่งที่ Supabase ทำตอน provisioning) |

ทุกสคริปต์ล้างข้อมูลที่ตัวเองสร้าง และปฏิเสธทำงานกับฐานข้อมูลที่ไม่ใช่ localhost

---

## ย้ายไปใช้ Supabase

Supabase ตอนเลือก **Choose GitHub repository** จะรัน migration ของโปรเจกต์เพื่อสร้างฐานข้อมูล ต้องมี `prisma/migrations/` อยู่แล้ว (ตอนนี้มี baseline แล้ว และ `check:migration` ยืนยันว่ารันบนฐานว่างผ่าน)

หลังจากสร้างโปรเจกต์แล้ว ตั้ง `.env` (หรือ environment variables บน host) ดังนี้

```bash
# สำหรับ migration — ต้องใช้การเชื่อมต่อตรง (port 5432) ไม่ใช่ pooler
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?schema=public"

# สำหรับแอปที่รันจริง — ใช้ pooler ได้ (port 6543) ต้องมี pgbouncer=true
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connection_limit=1"
```

ข้อควรระวัง:

- **ห้ามใช้ pooler ตอนรัน migration** — pooler ไม่รองรับ prepared statements และ Prisma จะ error
- **password ต้อง URL-encode** ถ้ามีอักขระพิเศษ
- **`prisma/seed.ts` ปฏิเสธฐานข้อมูลที่ไม่ใช่ localhost** ต้องตั้ง `SEED_ALLOW_REMOTE=true` ถ้าจะ seed Supabase (และระวังว่ามันลบทุกตาราง)
- ฐานข้อมูลเดิมในเครื่อง (ร้าน The Barbershop, หมวดคิว A/B/C, รอบเวลา) **ยังไม่ถูกย้ายไป** — ถ้าต้องการให้ย้าย ใช้ `pg_dump`/`pg_restore` แทนการ seed

---

## การตัดสินใจออกแบบที่ไม่เห็นจากโค้ด

### 1. Impersonation ไม่สลับ session — ใช้ cookie แยก

ตอนแอดมินกด "เข้าจัดการร้านนี้" ระบบ**ไม่**เปลี่ยน `jq_session` ไปเป็น user id ของเจ้าของร้าน แต่ใช้ cookie ที่สองชื่อ `jq_impersonate` = `<adminId>.<shopId>.<hmac>` (httpOnly, อายุ 1 ชั่วโมง)

เหตุผล — ถ้าสลับ session แล้ว `AdminLog.adminId` จะบันทึกเป็น **ร้านค้า** แทนที่จะเป็นแอดมิน ทำให้ audit trail โกหกไปเงียบ ๆ โดยไม่มีใครสังเกต วิธีนี้แอดมินยังคง role ADMIN อยู่ และทุกแถวใน log จึงขึ้นชื่อผู้กระทำจริงเสมอ

ข้อจำกัดที่ตั้งใจมี: scope ได้แค่ 1 ร้านต่อครั้ง กันแอดมินพลาดไปแก้ร้านอื่นโดยไม่ตั้งใจ — ดู `src/lib/impersonation.ts`

### 2. หน้าต่างจอง 2 วันซ่อมตัวเอง

โครงสร้างจริงคือ `TimeSlot` เก็บเป็นรายวัน (`shopId + date + startTime`) ถ้าวันนี้และพรุ่งนี้ "เลื่อน" ไปเรื่อย ๆ ร้านจะต้องกดเพิ่มรอบเวลาใหม่ทุกเช้า ไม่งั้นแท็บ "พรุ่งนี้" จะว่างเปล่าและจองล่วงหน้าไม่ได้เลย

`ensureTimeSlotWindow(shopId)` แก้โดย: ถ้าวันไหนว่าง ให้ copy โครงสร้างจากวันล่าสุดที่ยังมีข้อมูล มาเติม (`skipDuplicates` ทำให้เรียกซ้ำได้) เรียกทุกครั้งที่เปิดหน้า settings หรือหน้าจองของร้าน — ดู `src/lib/booking-window.ts`

**ข้อจำกัดที่ยังรู้อยู่:** ฟังก์ชันนี้เขียนฐานข้อมูลระหว่าง render ของหน้า public `/shop/[code]` ปลอดภัยเรื่องข้อมูลซ้ำเพราะมี unique key กัน แต่การเขียนบนเส้นทางที่ควรอ่านอย่างเดียวยังไม่ใช่วิธีที่ถูก ทางแก้จริงระยะยาวคือแยกตาราง `SlotTemplate` (เวลา + โควต้า + สวิตช์) ออกจาก `TimeSlot` (ของวันที่) แล้วค่อย materialize เป็นรายวัน

---

## เอกสารอื่น

- [Roadmap.md](Roadmap.md) — แผนงานและสถานะรายเฟส
- [Design.md](Design.md) — สเปกหน้าจอทั้ง 10 หน้า (C1-C4, M1-M4, A1-A2) กับ design tokens
- [docs/superpowers/specs/2026-09-14-jong-q-design.md](docs/superpowers/specs/2026-09-14-jong-q-design.md) — สเปกสถาปัตยกรรมฉบับแรก
- `.env.example` — ตัวแปรทั้งหมดที่โค้ดอ่าน
