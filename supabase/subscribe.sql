-- 키워드트립 여행 알림 구독. Supabase SQL Editor에서 한 번 실행.
-- 접근은 서버(api/subscribe.js)의 service role 키로만 합니다. RLS를 켜고 공개 정책은 두지 않습니다.

create table if not exists kt_subscribers (
  id uuid primary key default gen_random_uuid(),
  contact text not null unique,                 -- 휴대폰 번호(01012345678) 또는 이메일(소문자)
  contact_type text not null check (contact_type in ('phone', 'email')),
  consent_version text not null,                -- 동의 문구 버전
  consent_at timestamptz not null,              -- (필수) 알림 수집·이용 동의 시각
  marketing boolean not null default false,     -- (선택) 특가·이벤트 수신 동의
  marketing_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists kt_subscriber_destinations (
  subscriber_id uuid not null references kt_subscribers(id) on delete cascade,
  destination text not null,                    -- 여행지 id (예: bangkok)
  created_at timestamptz not null default now(),
  primary key (subscriber_id, destination)
);

create index if not exists kt_sub_dest_idx on kt_subscriber_destinations (destination);

alter table kt_subscribers enable row level security;
alter table kt_subscriber_destinations enable row level security;

-- 여행지별 구독자 수 (대시보드·발송 대상 확인용)
create or replace view kt_destination_counts with (security_invoker = true) as
  select destination, count(*) as subscribers
  from kt_subscriber_destinations group by destination order by subscribers desc;
