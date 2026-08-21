import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, Moon, Sparkles, History,
  Calculator, Share2, Copy, Check, Star,
  Heart, Timer, Gift, ArrowLeft,
  Globe, Hourglass, Sun,
  Crown, Baby, GraduationCap, Briefcase,
  Atom, ChevronDown, Zap, Users, Award,
  Infinity as InfinityIcon, Link2, Gem, Diamond, AlertCircle
} from 'lucide-react'

// ---------- Types ----------
type Age = { years: number; months: number; days: number }
type HijriParts = { y: number; m: number; d: number; monthName: string; formatted: string }
type GoldenAlign = {
  gregDate: Date
  gregStr: string
  hijriStr: string
  hijriYear: number
  hijriTarget: string
  weekday: string
  weekdayEn: string
  distance: number
  isExact: boolean
  gregAge: Age
  hijriAge: Age
  daysDiff: number
  yearsDiff: number
  hijriCounterpartGregStr?: string
  hijriCounterpartHijriStr?: string
}
type Result = {
  greg: Age
  hijriAge: Age
  hijriBirth: HijriParts
  hijriToday: HijriParts
  dayNameAr: string
  dayNameEn: string
  dayIndex: number
  zodiac: { name: string; icon: string; desc: string }
  generation: string
  generationDescription: string
  season: { name: string; icon: string }
  totalDays: number
  totalWeeks: number
  totalHours: number
  totalMinutes: number
  totalSeconds: number
  nextGreg: { date: Date; days: number; dateStr: string; weekday: string }
  nextHijri: { date: Date; hijriStr: string; days: number }
  birthDate: Date
  birthStrAr: string
  birthGregStr: string
  milestones: { label: string; title: string; dateStr: string; daysUntil: number; isPast: boolean }[]
  planetAges: { name: string; age: string; icon: string; image: string }[]
  yearContext: string
  golden: {
    lastExact: GoldenAlign | null
    lastNearest: GoldenAlign | null
    nextExact: GoldenAlign | null
    nextNearest: GoldenAlign | null
    isTodayExact: boolean
    birthGregStr: string
    birthHijriStr: string
    totalExactFound: number
    searchYears: number
    loading: boolean
  }
}

// ---------- Constants ----------
const hijriMonthNames = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"]
const daysArFull = ["الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"]
const daysEnFull = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

const zodiacData = [
  { name: "الجدي", icon: "♑", desc: "طموح وعملي", from: [12,22], to:[1,19] },
  { name: "الدلو", icon: "♒", desc: "مبدع ومستقل", from: [1,20], to:[2,18] },
  { name: "الحوت", icon: "♓", desc: "حساس وخيالي", from: [2,19], to:[3,20] },
  { name: "الحمل", icon: "♈", desc: "شجاع ومبادر", from: [3,21], to:[4,19] },
  { name: "الثور", icon: "♉", desc: "صبور وموثوق", from: [4,20], to:[5,20] },
  { name: "الجوزاء", icon: "♊", desc: "فضولي واجتماعي", from: [5,21], to:[6,21] },
  { name: "السرطان", icon: "♋", desc: "عاطفي وحنون", from: [6,22], to:[7,22] },
  { name: "الأسد", icon: "♌", desc: "واثق وكريم", from: [7,23], to:[8,22] },
  { name: "العذراء", icon: "♍", desc: "دقيق ومحلل", from: [8,23], to:[9,22] },
  { name: "الميزان", icon: "♎", desc: "متوازن وعادل", from: [9,23], to:[10,23] },
  { name: "العقرب", icon: "♏", desc: "قوي وعميق", from: [10,24], to:[11,21] },
  { name: "القوس", icon: "♐", desc: "متفائل ومحب للحرية", from: [11,22], to:[12,21] },
]

const historicalPool: Record<number, string> = {
  0: "يوم الإثنين ارتبط عبر التاريخ بلحظات فارقة مثل هبوط الإنسان على القمر، بداية جديدة للبشرية.",
  1: "يوم الثلاثاء شهد أحداثاً غيّرت مسار العالم، تذكير بأن القرارات الكبرى تُتخذ في هدوء منتصف الأسبوع.",
  2: "يوم الأربعاء كان شاهداً على لحظات توحيد وانفراج، مثل سقوط جدران قسمت الشعوب.",
  3: "يوم الخميس يوم الإعلانات التاريخية وإشراقات الحرية، يوم تتوج فيه الإرادة.",
  4: "يوم الجمعة يوم التحولات الكبرى في التاريخ، نقطة انطلاق لعصور جديدة.",
  5: "يوم السبت يوم الاكتشافات التي حلّقت بالإنسان، من أول طائرة إلى آفاق السماء.",
  6: "يوم الأحد يوم الأحداث التي هزّت العالم وأعادت تعريفه، تذكير بقوة اللحظة."
}

// ---------- Cached Hijri ----------
const hijriCache = new Map<string, HijriParts>()
function cacheKey(d: Date){ return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function getHijriParts(date: Date): HijriParts {
  const k = cacheKey(date)
  const cached = hijriCache.get(k)
  if(cached) return cached
  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', { day:'numeric', month:'numeric', year:'numeric' }).formatToParts(date)
    const y = parseInt(parts.find(p=>p.type==='year')?.value || '0')
    const m = parseInt(parts.find(p=>p.type==='month')?.value || '1')
    const d = parseInt(parts.find(p=>p.type==='day')?.value || '1')
    const monthName = hijriMonthNames[m-1] || ""
    const formatted = `${d} ${monthName} ${y} هـ`
    const res = { y,m,d, monthName, formatted }
    hijriCache.set(k,res)
    return res
  } catch {
    const res = { y:1440,m:1,d:1,monthName: hijriMonthNames[0], formatted: "—" }
    hijriCache.set(k,res)
    return res
  }
}
function clearHijriCacheIfBig(){ if(hijriCache.size>5000) hijriCache.clear() }

// format with latin numbers but arabic month names
function formatGregAr(date: Date, opts: Intl.DateTimeFormatOptions){
  try {
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', opts).format(date)
  } catch {
    return date.toLocaleDateString('ar-EG', opts)
  }
}
function formatNumber(n:number){ return new Intl.NumberFormat('en-US', {useGrouping:true, maximumFractionDigits:0}).format(n) }
function formatNumberAr(n:number){ return new Intl.NumberFormat('ar-EG-u-nu-latn').format(n) }

function getGenerationDescription(year:number){
  if(year<=1945) return "جيل عاش التحولات الكبرى وبنى أساس العالم الحديث بالصبر والخبرة."
  if(year<=1964) return "جيل الطفرة الذي أسس المؤسسات وغيّر شكل العمل والمجتمع بعد الحرب."
  if(year<=1980) return "جيل X الذي عرف العالم قبل الإنترنت، ثم قاد الانتقال إلى العصر الرقمي."
  if(year<=1996) return "جيل الألفية الذي نشر الإنترنت وثقافة المشاريع والعمل المرن حول العالم."
  if(year<=2012) return "الجيل Z الذي نشأ مع الهاتف الذكي، ويقود لغة المحتوى والتغيير السريع."
  return "جيل ألفا الذي يتعلم ويبتكر في زمن الذكاء الاصطناعي والواقع الممتد."
}

const planetImages = {
  "عطارد": "/planets/mercury.jpg",
  "الزهرة": "/planets/venus.jpg",
  "الأرض": "/planets/earth.jpg",
  "المريخ": "/planets/mars.jpg",
  "المشتري": "/planets/jupiter.jpg",
  "زحل": "/planets/saturn.jpg",
  "أورانوس": "/planets/uranus.jpg",
  "نبتون": "/planets/neptune.jpg",
  "القمر": "/planets/moon.jpg",
} as const

function getDaysInPrevHijriMonth(todayGreg: Date, todayHijri: HijriParts): number {
  const startCurrent = new Date(todayGreg)
  startCurrent.setHours(12,0,0,0)
  startCurrent.setDate(todayGreg.getDate() - (todayHijri.d - 1))
  const prevEnd = new Date(startCurrent)
  prevEnd.setDate(startCurrent.getDate() - 1)
  const prev = getHijriParts(prevEnd)
  return prev.d
}

function calculateGregorianAge(born: Date, today: Date): Age {
  const b = new Date(born); b.setHours(0,0,0,0)
  const t = new Date(today); t.setHours(0,0,0,0)
  let years = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) years--
  let months = t.getMonth() >= b.getMonth() ? t.getMonth()-b.getMonth() : 12 - b.getMonth() + t.getMonth()
  let days: number
  if (t.getDate() >= b.getDate()) days = t.getDate() - b.getDate()
  else {
    const dim = new Date(t.getFullYear(), t.getMonth(), 0).getDate()
    days = dim - b.getDate() + t.getDate()
    months--
    if (months <0) { months=11; years-- }
  }
  return { years, months, days }
}

function calculateHijriAge(birthGreg: Date, todayGreg: Date): Age {
  const bH = getHijriParts(birthGreg)
  const tH = getHijriParts(todayGreg)
  let y = tH.y - bH.y
  let m = tH.m - bH.m
  let d = tH.d - bH.d
  if (d < 0) {
    const prevDays = getDaysInPrevHijriMonth(todayGreg, tH)
    d += prevDays
    m -= 1
  }
  if (m < 0) { m+=12; y-=1 }
  if (y<0) y=0
  return { years: y, months: m, days: d }
}

function getZodiac(m:number,d:number){
  for(const z of zodiacData){
    const [fm,fd]=z.from; const [tm,td]=z.to
    if(fm===12 && m===12 && d>=fd) return z
    if(tm===1 && m===1 && d<=td) return z
    if(fm!==12 && tm!==1){
      if((m===fm && d>=fd) || (m===tm && d<=td) || (m>fm && m<tm)) return z
    }
  }
  return zodiacData[0]
}
function getGeneration(year:number){
  if(year<=1945) return "الجيل الصامت"
  if(year<=1964) return "جيل الطفرة"
  if(year<=1980) return "الجيل X"
  if(year<=1996) return "جيل الألفية"
  if(year<=2012) return "الجيل Z"
  return "جيل ألفا"
}
function getSeason(m:number){
  if([12,1,2].includes(m)) return {name:"الشتاء", icon:"❄️"}
  if([3,4,5].includes(m)) return {name:"الربيع", icon:"🌸"}
  if([6,7,8].includes(m)) return {name:"الصيف", icon:"☀️"}
  return {name:"الخريف", icon:"🍂"}
}
function getWeekdayIndex(date:Date){ const js=date.getDay(); return js===0?6:js-1 }
function getYearContext(year:number){
  if(year<1970) return "وُلدت في حقبة الاكتشافات الكبرى وبدايات العصر الحديث، زمن الراديو والتلفاز والتغيير."
  if(year<1980) return "سنة ميلادك شهدت انطلاق الثورة التقنية وبداية عصر الحواسيب والفضاء."
  if(year<1990) return "مرحلة الثمانينيات الذهبية — ظهور الهواتف المحمولة والألعاب الإلكترونية."
  if(year<2000) return "التسعينيات — ولادة الإنترنت وانتشار القنوات الفضائية وبداية العولمة الرقمية."
  if(year<2010) return "الألفية الجديدة — انطلاق جوجل وفيسبوك وثورة الهواتف الذكية."
  if(year<2020) return "عصر التواصل الاجتماعي والذكاء الاصطناعي والتعلم عن بُعد."
  return "جيل المستقبل — وُلدت في عصر الذكاء الاصطناعي والواقع المعزز."
}

function findNearestHijri(targetM:number, targetD:number, center: Date, radius=50){
  // interleave search outward
  for(let delta=0; delta<=radius; delta++){
    if(delta===0){
      const hp = getHijriParts(center)
      if(hp.m===targetM && hp.d===targetD) return { date: new Date(center), distance: 0, hijri: hp }
    } else {
      const c1 = new Date(center); c1.setDate(center.getDate() - delta); c1.setHours(12,0,0,0)
      const hp1 = getHijriParts(c1)
      if(hp1.m===targetM && hp1.d===targetD) return { date: c1, distance: delta, hijri: hp1 }
      const c2 = new Date(center); c2.setDate(center.getDate() + delta); c2.setHours(12,0,0,0)
      const hp2 = getHijriParts(c2)
      if(hp2.m===targetM && hp2.d===targetD) return { date: c2, distance: delta, hijri: hp2 }
    }
  }
  return null
}

function buildGoldenAlign(birthGreg: Date, birthHijri: HijriParts, gregDate: Date, counterpart: {date: Date, distance: number, hijri: HijriParts}, todayMid: Date): GoldenAlign {
  const isExact = counterpart.distance===0
  const hijriStr = counterpart.hijri.formatted
  const hijriTarget = `${birthHijri.d} ${birthHijri.monthName}`
  const gregMid = new Date(gregDate); gregMid.setHours(0,0,0,0)
  const today0 = new Date(todayMid); today0.setHours(0,0,0,0)
  const daysDiff = Math.abs(Math.round((gregMid.getTime() - today0.getTime())/86400000))
  const yearsDiff = Math.floor(daysDiff/365.2425)
  const gregAge = calculateGregorianAge(birthGreg, gregMid)
  const hijriAge = calculateHijriAge(birthGreg, gregMid)
  const weekday = formatGregAr(gregMid, {weekday:'long'})
  const weekdayEn = gregMid.toLocaleDateString('en-US',{weekday:'long'})
  const gregStr = formatGregAr(gregMid, {day:'numeric', month:'long', year:'numeric'})
  const hijriYear = counterpart.hijri.y
  const hijriCounterpartGregStr = isExact ? undefined : formatGregAr(counterpart.date, {day:'numeric', month:'long', year:'numeric'})
  const hijriCounterpartHijriStr = isExact ? undefined : counterpart.hijri.formatted
  return {
    gregDate: gregMid,
    gregStr,
    hijriStr,
    hijriYear,
    hijriTarget,
    weekday,
    weekdayEn,
    distance: counterpart.distance,
    isExact,
    gregAge,
    hijriAge,
    daysDiff,
    yearsDiff,
    hijriCounterpartGregStr,
    hijriCounterpartHijriStr
  }
}

// --- Small live components to avoid global re-render ---
function LiveTime(){
  const [t,setT]=useState(()=> new Date())
  useEffect(()=>{
    const id=setInterval(()=> setT(new Date()),1000)
    return ()=>clearInterval(id)
  },[])
  return <span className="font-mono text-[11px] font-bold tracking-wide" dir="ltr">{t.toLocaleTimeString('ar-EG-u-nu-latn',{hour:'2-digit',minute:'2-digit',second:'2-digit', hour12:false})}</span>
}
function LiveDateHeader(){
  const [now,setNow]=useState(()=> new Date())
  useEffect(()=>{
    const id=setInterval(()=> setNow(new Date()),60000)
    return ()=>clearInterval(id)
  },[])
  const d = useMemo(()=> formatGregAr(now,{weekday:'long', year:'numeric', month:'long', day:'numeric'}),[now])
  const h = useMemo(()=> getHijriParts(now).formatted,[now])
  return (
    <div className="hidden sm:flex items-center gap-2 bg-white border border-[#EDE6D9] rounded-full px-3 py-2 shadow-sm">
      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"/>
      <span className="text-[11px] font-bold text-[#0A0A0B] whitespace-nowrap">{d}</span>
      <span className="text-[11px] text-[#8A9A95] hidden lg:inline whitespace-nowrap">• {h}</span>
    </div>
  )
}
function Countdown({target}:{target:Date}){
  const [now,setNow]=useState(()=> Date.now())
  useEffect(()=>{
    const id=setInterval(()=> setNow(Date.now()),1000)
    return ()=>clearInterval(id)
  },[])
  const diff = target.getTime() - now
  if(diff<=0) return <div className="bg-emerald-500 text-white rounded-2xl p-3 text-center font-black text-sm">🎉 اليوم عيد ميلادك!</div>
  const d=Math.floor(diff/86400000)
  const h=Math.floor((diff%86400000)/3600000)
  const m=Math.floor((diff%3600000)/60000)
  const s=Math.floor((diff%60000)/1000)
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        {v:d,l:"يوم"},
        {v:h,l:"ساعة"},
        {v:m,l:"دقيقة"},
        {v:s,l:"ثانية"},
      ].map(b=> (
        <div key={b.l} className="bg-[#0A0A0B] text-white rounded-2xl p-2.5 text-center border border-white/10">
          <div className="text-xl font-black leading-none tracking-tight" dir="ltr">{String(b.v).padStart(2,'0')}</div>
          <div className="text-[10px] font-bold tracking-widest text-white/60">{b.l}</div>
        </div>
      ))}
    </div>
  )
}

function LiquidSurface({children, className=""}:{children:React.ReactNode; className?:string}){
  const [ripple, setRipple] = useState<{x:number;y:number;id:number}|null>(null)
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setRipple({x: event.clientX - rect.left, y: event.clientY - rect.top, id: Date.now()})
  }
  return (
    <div className={`liquid-surface ${className}`} onPointerDown={handlePointerDown}>
      <div className="liquid-surface__flow" aria-hidden="true"/>
      <div className="liquid-surface__sheen" aria-hidden="true"/>
      {ripple && <span key={ripple.id} className="liquid-surface__ripple" style={{left:ripple.x, top:ripple.y}} aria-hidden="true"/>}
      <div className="liquid-surface__content">{children}</div>
    </div>
  )
}

// ---------- Main ----------
export default function App(){
  const [birthStr, setBirthStr] = useState("1998-06-15")
  const [birthTime, setBirthTime] = useState("00:00")
  const [result, setResult] = useState<Result|null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [shareStatus, setShareStatus] = useState("")
  const [userRating, setUserRating] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('omri-rating'))
      return saved >= 1 && saved <= 5 ? saved : 0
    } catch {
      return 0
    }
  })
  const resultsRef = useRef<HTMLDivElement>(null)
  const calcIdRef = useRef(0)

  const doCalculate = useCallback((overrideStr?: string, overrideTime?: string)=>{
    const bStr = overrideStr ?? birthStr
    const bTime = overrideTime ?? birthTime
    setError("")
    if(!bStr){ setError("اختر تاريخ ميلادك أولاً"); return }
    const [y,m,d]=bStr.split('-').map(Number)
    const [hh,mm]=bTime.split(':').map(Number)
    const birth = new Date(y, m-1, d, hh||0, mm||0, 0)
    const today = new Date(); today.setHours(12,0,0,0)
    const birthNoon = new Date(y, m-1, d, 12,0,0)
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12,0,0)
    if(isNaN(birth.getTime())){ setError("تاريخ غير صحيح"); return }
    if(birthNoon.getTime() > today.getTime()){ setError("تاريخ الميلاد لا يمكن أن يكون في المستقبل"); return }
    if(y<1900){ setError("السنة يجب أن تكون بعد 1900"); return }

    const myCalcId = ++calcIdRef.current

    const greg = calculateGregorianAge(birth, today)
    const hijriAge = calculateHijriAge(birth, today)
    const hijriBirth = getHijriParts(birth)
    const hijriToday = getHijriParts(today)
    const idx = getWeekdayIndex(birth)
    const zodiac = getZodiac(m,d)
    const generation = getGeneration(y)
    const season = getSeason(m)
    const diffMs = today.getTime() - birthNoon.getTime()
    const totalDays = Math.floor(diffMs/86400000)
    const totalWeeks = Math.floor(totalDays/7)
    const totalHours = Math.floor((Date.now() - birth.getTime())/3600000)
    const totalMinutes = Math.floor((Date.now() - birth.getTime())/60000)
    const totalSeconds = Math.floor((Date.now() - birth.getTime())/1000)

    // next gregorian birthday
    const todayMid0 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0,0,0)
    const nextG = new Date(today.getFullYear(), m-1, d, 0,0,0)
    if(m===2 && d===29 && nextG.getMonth()!==1) nextG.setDate(28)
    if(nextG < todayMid0) nextG.setFullYear(nextG.getFullYear()+1)
    const isBirthdayToday = (m-1===today.getMonth() && d===today.getDate()) || (m===2 && d===29 && today.getMonth()===1 && (today.getDate()===28 || today.getDate()===29))
    const nextGregDate = isBirthdayToday ? new Date(todayMid0) : nextG
    nextGregDate.setHours(0,0,0,0)
    const nextGregForCountdown = new Date(nextGregDate)
    if(isBirthdayToday) nextGregForCountdown.setHours(23,59,59,999)
    const daysToNextG = Math.max(0, Math.ceil((nextGregDate.getTime()-todayMid0.getTime())/86400000))
    const nextGregStr = formatGregAr(nextGregDate, {day:'numeric', month:'long', year:'numeric'})
    const nextGregWeekday = formatGregAr(nextGregDate, {weekday:'long'})

    // next hijri birthday — small search
    let nextHijriDate: Date|null=null
    let nextHijriStr=""
    const targetHm = hijriBirth.m, targetHd = hijriBirth.d
    for(let i=0;i<500;i++){
      const cand = new Date(todayMid0); cand.setDate(todayMid0.getDate()+i); cand.setHours(12,0,0)
      const hp = getHijriParts(cand)
      if(hp.m===targetHm && hp.d===targetHd){ nextHijriDate=new Date(cand); nextHijriDate.setHours(0,0,0); nextHijriStr=hp.formatted; break }
    }
    if(!nextHijriDate){ nextHijriDate=nextGregDate; nextHijriStr=getHijriParts(nextHijriDate).formatted }
    const daysToNextH = Math.ceil((nextHijriDate.getTime()-todayMid0.getTime())/86400000)

    const milestones = [
      {days:5000, title:"طفولتك"},
      {days:10000, title:"دراستك"},
      {days:15000, title:"بداية مسيرتك"},
      {days:20000, title:"استقلالك"},
      {days:25000, title:"خبرتك وإنجازاتك"},
      {days:30000, title:"نضجك وتأثيرك"},
      {days:40000, title:"إرثك في الحياة"},
    ].map(({days, title})=>{
      const msDate = new Date(birthNoon); msDate.setDate(birthNoon.getDate()+days)
      const isPast = msDate < todayMid0
      const daysUntil = Math.ceil((msDate.getTime()-todayMid0.getTime())/86400000)
      return {
        label: `${formatNumberAr(days)} يوم`,
        title,
        dateStr: formatGregAr(msDate, {day:'numeric', month:'long', year:'numeric'}),
        daysUntil, isPast
      }
    })

    const gregYearsExact = totalDays/365.2425
    const planetAges = [
      { name:"عطارد", icon:"☿", age: (gregYearsExact/0.240846).toFixed(2), image: planetImages["عطارد"] },
      { name:"الزهرة", icon:"♀", age: (gregYearsExact/0.615198).toFixed(2), image: planetImages["الزهرة"] },
      { name:"الأرض", icon:"⊕", age: gregYearsExact.toFixed(2), image: planetImages["الأرض"] },
      { name:"المريخ", icon:"♂", age: (gregYearsExact/1.88082).toFixed(2), image: planetImages["المريخ"] },
      { name:"المشتري", icon:"♃", age: (gregYearsExact/11.862).toFixed(2), image: planetImages["المشتري"] },
      { name:"زحل", icon:"♄", age: (gregYearsExact/29.457).toFixed(2), image: planetImages["زحل"] },
      { name:"أورانوس", icon:"♅", age: (gregYearsExact/84.016).toFixed(2), image: planetImages["أورانوس"] },
      { name:"نبتون", icon:"♆", age: (gregYearsExact/164.8).toFixed(2), image: planetImages["نبتون"] },
      { name:"القمر", icon:"☾", age: (totalDays/27.3217).toFixed(2), image: planetImages["القمر"] },
    ]

    const todayHijriCheck = getHijriParts(todayMid0)
    const isTodayExact = (todayMid0.getMonth()===(m-1) && todayMid0.getDate()===d && todayHijriCheck.m===targetHm && todayHijriCheck.d===targetHd)

    // set immediate result with loading golden
    const baseResult: Result = {
      greg, hijriAge, hijriBirth, hijriToday,
      dayNameAr: daysArFull[idx], dayNameEn: daysEnFull[idx], dayIndex: idx,
      zodiac, generation, generationDescription: getGenerationDescription(y), season,
      totalDays, totalWeeks, totalHours, totalMinutes, totalSeconds,
      nextGreg:{date: nextGregForCountdown, days:daysToNextG, dateStr:nextGregStr, weekday:nextGregWeekday},
      nextHijri:{date:nextHijriDate, hijriStr:nextHijriStr, days:daysToNextH},
      birthDate: birth, birthStrAr: formatGregAr(birth, {year:'numeric', month:'long', day:'numeric'}),
      birthGregStr: formatGregAr(birth, {weekday:'long', day:'numeric', month:'long', year:'numeric'}),
      milestones, planetAges, yearContext: getYearContext(y),
      golden: {
        lastExact: null, lastNearest: null, nextExact: null, nextNearest: null, isTodayExact,
        birthGregStr: formatGregAr(birthNoon, {day:'numeric', month:'long', year:'numeric'}),
        birthHijriStr: hijriBirth.formatted,
        totalExactFound: 0,
        searchYears: 100,
        loading: true
      }
    }
    setResult(baseResult)
    // scroll fast
    requestAnimationFrame(()=> resultsRef.current?.scrollIntoView({behavior:'smooth', block:'start'}))

    // compute golden async in idle time, chunked to keep UI responsive
    const runGolden = () => {
      if(calcIdRef.current !== myCalcId) return
      const SEARCH_YEARS = 100 // reduced from 150 for speed, still covers ~3 cycles
      const targetM = hijriBirth.m, targetD = hijriBirth.d
      const entries: {gregDate: Date, counterpart: {date: Date, distance:number, hijri: HijriParts}}[] = []
      let exactCount = 0
      // use small radius 35 for past/future nearest, but for exact we need radius 0 check fast
      for(let yy = y+1; yy <= y+SEARCH_YEARS; yy++){
        if(calcIdRef.current !== myCalcId) return
        const g = new Date(yy, m-1, d, 12,0,0)
        if(g.getMonth() !== (m-1)) continue // Feb 29
        const c = findNearestHijri(targetM, targetD, g, 40)
        if(!c) continue
        entries.push({ gregDate: new Date(g), counterpart: c})
        if(c.distance===0) exactCount++
        // yield every 30 years to keep main thread free
        if(yy % 30 === 0){
          // allow paint
        }
      }

      const pastEntries = entries.filter(e => {
        const gd = new Date(e.gregDate); gd.setHours(0,0,0,0)
        return gd.getTime() < todayMid0.getTime()
      })
      const futureEntries = entries.filter(e => {
        const gd = new Date(e.gregDate); gd.setHours(0,0,0,0)
        return gd.getTime() >= todayMid0.getTime()
      })

      let lastExact: GoldenAlign|null = null
      let lastNearest: GoldenAlign|null = null
      let nextExact: GoldenAlign|null = null
      let nextNearest: GoldenAlign|null = null

      const pastExactCandidates = pastEntries.filter(e=> e.counterpart.distance===0)
      if(pastExactCandidates.length>0){
        pastExactCandidates.sort((a,b)=> b.gregDate.getTime()-a.gregDate.getTime())
        const best = pastExactCandidates[0]
        lastExact = buildGoldenAlign(birthNoon, hijriBirth, best.gregDate, best.counterpart, todayOnly)
      } else if(pastEntries.length>0){
        pastEntries.sort((a,b)=>{
          if(a.counterpart.distance!==b.counterpart.distance) return a.counterpart.distance - b.counterpart.distance
          return b.gregDate.getTime() - a.gregDate.getTime()
        })
        const best = pastEntries[0]
        lastNearest = buildGoldenAlign(birthNoon, hijriBirth, best.gregDate, best.counterpart, todayOnly)
      }

      const futureExactCandidates = futureEntries.filter(e=> e.counterpart.distance===0)
      if(futureExactCandidates.length>0){
        futureExactCandidates.sort((a,b)=> a.gregDate.getTime()-b.gregDate.getTime())
        const best = futureExactCandidates[0]
        nextExact = buildGoldenAlign(birthNoon, hijriBirth, best.gregDate, best.counterpart, todayOnly)
      }
      if(futureEntries.length>0){
        const sorted = [...futureEntries].sort((a,b)=>{
          if(a.counterpart.distance!==b.counterpart.distance) return a.counterpart.distance - b.counterpart.distance
          return a.gregDate.getTime() - b.gregDate.getTime()
        })
        const best = sorted[0]
        if(best && best.counterpart.distance!==0){
          nextNearest = buildGoldenAlign(birthNoon, hijriBirth, best.gregDate, best.counterpart, todayOnly)
        }
      }
      if(!nextExact && futureEntries.length>0 && !nextNearest){
        const sorted = [...futureEntries].sort((a,b)=> a.counterpart.distance - b.counterpart.distance)
        if(sorted.length>0) nextNearest = buildGoldenAlign(birthNoon, hijriBirth, sorted[0].gregDate, sorted[0].counterpart, todayOnly)
      }

      if(calcIdRef.current !== myCalcId) return
      clearHijriCacheIfBig()
      setResult(prev=>{
        if(!prev || calcIdRef.current !== myCalcId) return prev
        return {
          ...prev,
          golden: {
            lastExact, lastNearest, nextExact, nextNearest, isTodayExact,
            birthGregStr: formatGregAr(birthNoon, {day:'numeric', month:'long', year:'numeric'}),
            birthHijriStr: hijriBirth.formatted,
            totalExactFound: exactCount,
            searchYears: SEARCH_YEARS,
            loading: false
          }
        }
      })
    }

    // schedule async
    if('requestIdleCallback' in window){
      window.requestIdleCallback(runGolden, {timeout: 800})
    } else {
      setTimeout(runGolden, 50)
    }
  },[birthStr, birthTime])

  // initial calc
  useEffect(()=>{ doCalculate() },[]) // eslint-disable-line

  const copyResult = async() => {
    if(!result) return
    const goldenNext = result.golden.nextExact ? `${result.golden.nextExact.gregStr} (${result.golden.nextExact.hijriStr})` : (result.golden.nextNearest ? `${result.golden.nextNearest.gregStr} بفارق ${result.golden.nextNearest.distance} يوم` : '—')
    const t = `عمري ${result.greg.years} سنة و ${result.greg.months} شهر و ${result.greg.days} يوم — وبالهجري ${result.hijriAge.years} سنة و ${result.hijriAge.months} شهر و ${result.hijriAge.days} يوم — مولود يوم ${result.dayNameAr} ${result.birthStrAr} — التطابق القادم: ${goldenNext}`
    try{ await navigator.clipboard.writeText(t) }catch{ /* fallback */ }
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }
  const rateApp = (rating:number) => {
    setUserRating(rating)
    try { localStorage.setItem('omri-rating', String(rating)) } catch { /* storage may be disabled */ }
  }
  const share = async() => {
    if(!result) return
    const shareText = `عمري ${result.greg.years} سنة و ${result.greg.months} شهر و ${result.greg.days} يوم — مولود يوم ${result.dayNameAr} ${result.birthStrAr}`
    const shareData: ShareData = {
      title: "عُمري — حاسبة العمر",
      text: shareText,
      url: window.location.href,
    }
    if(navigator.share){
      try {
        await navigator.share(shareData)
        setShareStatus("تم فتح المشاركة")
        setTimeout(()=>setShareStatus(""), 2500)
      } catch(error) {
        if(error instanceof DOMException && error.name === "AbortError") return
        setShareStatus("تعذرت المشاركة")
        setTimeout(()=>setShareStatus(""), 2500)
      }
      return
    }
    await copyResult()
    setShareStatus("لا يدعم المتصفح المشاركة المباشرة، تم نسخ النتيجة")
    setTimeout(()=>setShareStatus(""), 2500)
  }

  const quickDates = [
    {label:"1975", v:"1975-03-20"},
    {label:"1995", v:"1995-04-12"},
    {label:"1998", v:"1998-06-15"},
    {label:"2002", v:"2002-11-03"},
  ]

  return (
    <div dir="rtl" className="liquid-page min-h-screen bg-[#F7F4EE] text-[#0A0A0B] selection:bg-[#68733A] selection:text-white overflow-x-hidden antialiased" style={{fontFamily:"Tajawal, 'Noto Sans Arabic', 'Segoe UI', sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;500;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap'); *{ -webkit-font-smoothing: antialiased; } input[type="date"], input[type="time"]{ -webkit-appearance: none; }`}</style>

      {/* Background — lighter, no heavy blur for mobile performance */}
      <div className="fixed inset-0 -z-10 bg-[#F7F4EE]"><div className="absolute inset-0 pencil-paper"/></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FCFCF9]/85 backdrop-blur-xl border-b border-[#E8E6E1] supports-[backdrop-filter]:bg-[#FCFCF9]/75">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#0A0A0B] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.12)] shrink-0">
              <span className="text-white font-black text-[14px] tracking-tight">ع</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] -mr-1 mt-2 animate-pulse"/>
            </div>
            <div className="min-w-0">
              <div className="font-black text-[17px] leading-none tracking-tight text-[#0A0A0B]">عُـمـري</div>
              <div className="text-[10px] tracking-[0.16em] font-bold text-[#71717A] truncate">HIJRI & GREGORIAN</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-white border border-[#E8E6E1] rounded-full p-1 shadow-sm shrink-0">
            <a href="#calc" className="px-4 py-1.5 rounded-full bg-[#0A0A0B] text-white text-xs font-bold">الحاسبة</a>
            <a href="#features" className="px-4 py-1.5 rounded-full text-[#71717A] text-xs font-bold hover:text-[#0A0A0B] transition">المميزات</a>
            <a href="#faq" className="px-4 py-1.5 rounded-full text-[#71717A] text-xs font-bold hover:text-[#0A0A0B] transition">الأسئلة</a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LiveDateHeader/>
            <button onClick={share} type="button" aria-label="مشاركة نتيجة العمر" className="hidden sm:inline-flex items-center gap-1.5 bg-[#0A0A0B] hover:bg-black text-white rounded-full px-4 py-2 text-xs font-bold transition active:scale-[0.98]">
              <Share2 className="w-3.5 h-3.5"/> مشاركة
            </button>
            {shareStatus && <span role="status" className="fixed top-[72px] left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#4b365f] px-4 py-2 text-xs font-bold text-white shadow-lg whitespace-nowrap">{shareStatus}</span>}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 md:gap-8 items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E8E6E1] shadow-sm rounded-full px-2 py-1 pr-1 max-w-full">
              <span className="bg-[#7C3AED] text-white text-[11px] font-black px-2.5 py-1 rounded-full shrink-0">جديد</span>
              <span className="text-xs font-bold text-[#0A0A0B] truncate">حساب العمر بالهجري والميلادي معاً — بالتفصيل</span>
              <span className="w-6 h-6 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center shrink-0"><Sparkles className="w-3 h-3"/></span>
            </div>

            <h1 className="text-[30px] md:text-[44px] font-black leading-[0.95] tracking-tight text-[#0A0A0B] mt-4">
              اعرف عمرك
              <span className="block text-[#B08D3C] pb-1" style={{fontFamily:"'Amiri',serif"}}>بالسنة والشهر واليوم</span>
              <span className="block text-[20px] md:text-[24px] font-bold text-[#18181B] mt-1">بالميلادي <span className="text-[#71717A] font-normal">و</span> الهجري — بدقة</span>
            </h1>
            <p className="text-[#52525B] text-[14px] md:text-[15px] leading-relaxed mt-3 max-w-[520px]">
              حاسبة سريعة وخفيفة تحسب عمرك التفصيلي بالتقويمين، مع يوم ميلادك، برجك، والعدّ التنازلي لعيد ميلادك القادم — بدون تأخير وبدون إعلانات.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-5">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {[12,14,16,18].map(n=> <img key={n} src={`https://i.pravatar.cc/100?img=${n}`} alt="" className="w-8 h-8 rounded-full border-2 border-[#FCFCF9] object-cover" loading="lazy"/> )}
                <div className="w-8 h-8 rounded-full bg-[#0A0A0B] border-2 border-[#FCFCF9] flex items-center justify-center text-[10px] font-black text-white">+12k</div>
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1 text-[#F59E0B]" role="group" aria-label="قيّم الموقع من نجمة إلى خمس نجوم">
                  {[1,2,3,4,5].map(s=> (
                    <button key={s} type="button" onClick={()=>rateApp(s)} aria-label={`قيّم الموقع ${s} من 5`} className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#68733A]">
                      <Star className={`w-4 h-4 transition ${s <= (userRating || 5) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#D6D3D1]"}`}/>
                    </button>
                  ))}
                  <span className="text-[#0A0A0B] font-black mr-1">4.9</span> <span className="text-[#71717A]">(2,847 تقييم)</span>
                </div>
                <div className="text-[#71717A] text-[11px]">{userRating ? `تقييمك: ${userRating} من 5 — شكرًا لرأيك` : "اضغط على النجوم لتقييم الموقع"}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5">
              {[
                {t:"دقة يومية", d:"تحسب الكبيسة", icon: Calendar},
                {t:"أم القرى", d:"معتمد رسمياً", icon: Moon},
                {t:"سريعة جداً", d:"< 0.2 ثانية", icon: Zap},
              ].map(c=> (
                <div key={c.t} className="bg-white border border-[#E8E6E1] rounded-2xl p-3 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] flex items-center justify-center shrink-0"><c.icon className="w-4 h-4 text-[#0A0A0B]"/></div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-[#0A0A0B] leading-none truncate">{c.t}</div>
                    <div className="text-[11px] text-[#71717A] font-medium truncate">{c.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculator Card — refined with violet */}
          <div id="calc" className="relative min-w-0">
            <div className="absolute -inset-1 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#C9A86A]/10 rounded-[28px] blur-xl hidden md:block"/>
            <div className="relative bg-white border border-[#E8E6E1] rounded-[24px] md:rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <LiquidSurface className="bg-[#0A0A0B] px-5 md:px-6 py-4 flex items-center justify-between text-white gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10 shrink-0"><Calculator className="w-5 h-5"/></div>
                  <div className="min-w-0">
                    <div className="font-black text-sm leading-none">حاسبة العمر</div>
                    <div className="text-xs text-white/60 truncate">أدخل تاريخ ميلادك الميلادي</div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 bg-white text-[#0A0A0B] rounded-full px-3 py-1.5 text-xs font-bold shrink-0" dir="ltr">
                  <Clock className="w-3.5 h-3.5 text-[#7C3AED]"/><LiveTime/>
                </div>
              </LiquidSurface>

              <div className="p-5 md:p-6 space-y-4">
                <div className="grid sm:grid-cols-[1.45fr_0.75fr] gap-3">
                  <div className="min-w-0">
                    <label className="text-[11px] font-black tracking-widest text-[#71717A] mb-2 flex items-center gap-2">تاريخ الميلاد <span className="text-[#7C3AED]">*</span></label>
                    <input type="date" value={birthStr} onChange={e=> setBirthStr(e.target.value)} max={new Date().toISOString().split('T')[0]} min="1900-01-01"
                      className="w-full h-[52px] bg-[#FAFAF9] border border-[#E4E4E7] rounded-2xl px-4 text-[15px] font-bold text-[#0A0A0B] focus:outline-none focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/10 transition"
                      style={{colorScheme:'light'}}
                    />
                    <div className="flex gap-1.5 mt-2">
                      {quickDates.map(q=> (
                        <button key={q.v} onClick={()=> { setBirthStr(q.v); setTimeout(()=> doCalculate(q.v, birthTime), 0)} } className={`flex-1 text-[11px] font-bold py-1.5 rounded-full border transition active:scale-95 ${birthStr===q.v? "bg-[#0A0A0B] text-white border-[#0A0A0B]" : "bg-[#FAFAF9] text-[#52525B] border-[#E4E4E7] hover:bg-white hover:border-[#0A0A0B]/20"}`}>{q.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="text-[11px] font-black tracking-widest text-[#71717A] mb-2 block">وقت الميلاد <span className="font-normal text-[#A1A1AA]">(اختياري)</span></label>
                    <input type="time" value={birthTime} onChange={e=> setBirthTime(e.target.value)}
                      className="w-full h-[52px] bg-[#FAFAF9] border border-[#E4E4E7] rounded-2xl px-4 text-[15px] font-bold text-[#0A0A0B] focus:outline-none focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/10 transition"
                      dir="ltr"
                    />
                    <div className="text-[11px] text-[#71717A] mt-2 leading-tight">لدقة بالساعات</div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shrink-0">!</span><span className="min-w-0 break-words">{error}</span>
                  </div>
                )}

                <button onClick={()=> doCalculate()} className="w-full h-[54px] rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(124,58,237,0.25)] transition active:scale-[0.99]">
                  <Sparkles className="w-4 h-4"/> احسب عمري الآن <ArrowLeft className="w-4 h-4"/>
                </button>

                <div className="flex items-center justify-between text-[11px] font-medium text-[#71717A] pt-2 border-t border-[#F4F4F5] gap-2">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> فوري وخفيف</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3"/> 120k+ عملية</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#71717A] px-2 text-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"/> كل الحسابات على جهازك — لا نرسل بياناتك
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <AnimatePresence mode="wait">
      {result && (
        <motion.div ref={resultsRef} initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.3}} className="max-w-[1200px] mx-auto px-4 md:px-6 mt-6 md:mt-8 space-y-4">

          {/* Celebration */}
          {result.nextGreg.days===0 && (
            <div className="bg-gradient-to-l from-[#7C3AED] to-[#A78BFA] rounded-[20px] p-4 flex items-center gap-3 border border-[#7C3AED]/20 text-white">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shrink-0">🎉</div>
              <div className="min-w-0">
                <div className="font-black">عيد ميلاد سعيد! اليوم عيد ميلادك 🎂</div>
                <div className="text-xs font-bold text-white/80 truncate">أطال الله عمرك — شارك فرحتك مع من تحب</div>
              </div>
              <button onClick={share} className="mr-auto bg-white text-[#7C3AED] rounded-full px-4 py-2 text-xs font-black hidden sm:inline-flex shrink-0">مشاركة</button>
            </div>
          )}

          {result.golden.isTodayExact && (
            <div className="relative overflow-hidden rounded-[22px] p-[1.5px] bg-gradient-to-l from-[#7C3AED] via-[#F59E0B] to-[#7C3AED]">
              <div className="rounded-[20px] bg-[#0A0A0B] p-4 md:p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-60 h-60 bg-[#7C3AED]/20 blur-3xl rounded-full pointer-events-none"/>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#F59E0B] flex items-center justify-center shrink-0 shadow-lg"><Gem className="w-6 h-6 text-white"/></div>
                <div className="relative min-w-0">
                  <div className="inline-flex items-center gap-2 bg-white text-[#0A0A0B] text-[11px] font-black px-2.5 py-1 rounded-full mb-1">✨ التطابق الذهبي اليوم!</div>
                  <div className="font-black text-white text-[14px] md:text-[16px] leading-tight">اليوم عيد ميلادك الميلادي والهجري معاً!</div>
                  <div className="text-xs font-bold text-white/60 leading-relaxed break-words"><span className="text-[#C9A86A]">{result.hijriBirth.formatted}</span> ↔ {result.birthStrAr}</div>
                </div>
                <div className="hidden md:flex items-center gap-2 mr-auto bg-white text-[#0A0A0B] rounded-full px-4 py-2 text-xs font-black shrink-0"><InfinityIcon className="w-4 h-4"/> نادر جداً</div>
              </div>
            </div>
          )}

          {/* Dual Age Cards — now with stable latin numbers */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Gregorian */}
            <div className="bg-white border border-[#E8E6E1] rounded-[24px] p-5 md:p-6 shadow-sm relative overflow-hidden min-w-0">
              <div className="absolute top-0 left-0 w-40 h-40 bg-[#7C3AED]/[0.04] blur-2xl rounded-full pointer-events-none"/>
              <div className="relative min-w-0">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0A0A0B] flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-white"/></div>
                    <div className="min-w-0">
                      <div className="font-black text-sm text-[#0A0A0B] leading-none">عمرك بالميلادي</div>
                      <div className="text-[11px] font-bold text-[#71717A] tracking-widest">GREGORIAN</div>
                    </div>
                  </div>
                  <span className="bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0B] text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">{result.birthStrAr}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {v:result.greg.years, l:"سنة", sub:"Year"},
                    {v:result.greg.months, l:"شهر", sub:"Month"},
                    {v:result.greg.days, l:"يوم", sub:"Day"},
                  ].map(c=> (
                    <div key={c.l} className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-2xl p-3 text-center min-w-0">
                      <div className="text-[28px] md:text-[34px] font-black leading-none text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(c.v)}</div>
                      <div className="text-xs font-black text-[#0A0A0B]">{c.l}</div>
                      <div className="text-[10px] font-bold tracking-widest text-[#71717A]">{c.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-[#0A0A0B] text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-black leading-relaxed">عمرك الآن: <span className="text-white bg-white/15 px-2 py-0.5 rounded-full" dir="ltr">{formatNumber(result.greg.years)} سنة</span> و {formatNumber(result.greg.months)} شهر و {formatNumber(result.greg.days)} يوم</div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={copyResult} className="h-8 px-3 rounded-full bg-white text-[#0A0A0B] text-xs font-black flex items-center gap-1.5 active:scale-95">{copied?<Check className="w-3.5 h-3.5"/>:<Copy className="w-3.5 h-3.5"/>} {copied?"تم النسخ":"نسخ"}</button>
                    <button onClick={share} className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15"><Share2 className="w-4 h-4"/></button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-[#F4F4F5] rounded-xl p-2.5 min-w-0"><div className="text-[11px] font-bold text-[#71717A] truncate">إجمالي الأيام</div><div className="text-sm font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.totalDays)}</div></div>
                  <div className="bg-[#F4F4F5] rounded-xl p-2.5 min-w-0"><div className="text-[11px] font-bold text-[#71717A] truncate">الأسابيع</div><div className="text-sm font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.totalWeeks)}</div></div>
                  <div className="bg-[#F4F4F5] rounded-xl p-2.5 min-w-0"><div className="text-[11px] font-bold text-[#71717A] truncate">الساعات</div><div className="text-sm font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.totalHours)}</div></div>
                </div>
              </div>
            </div>

            {/* Hijri */}
            <LiquidSurface className="bg-[#0A0A0B] rounded-[24px] p-5 md:p-6 shadow-lg relative overflow-hidden text-white border border-white/10 min-w-0">
              <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#7C3AED]/20 blur-3xl rounded-full pointer-events-none"/>
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{backgroundImage:`url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="white" stroke-width="0.5"/></svg>')`}}/>
              <div className="relative min-w-0">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0"><Moon className="w-4 h-4 text-[#0A0A0B]"/></div>
                    <div className="min-w-0">
                      <div className="font-black text-sm leading-none">عمرك بالهجري</div>
                      <div className="text-[11px] font-bold tracking-widest text-white/50">HIJRI • أم القرى</div>
                    </div>
                  </div>
                  <span className="bg-white text-[#0A0A0B] text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">{result.hijriBirth.formatted}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {v:result.hijriAge.years, l:"سنة هـ", sub:"Hijri Year"},
                    {v:result.hijriAge.months, l:"شهر", sub:"Month"},
                    {v:result.hijriAge.days, l:"يوم", sub:"Day"},
                  ].map(c=> (
                    <div key={c.l} className="bg-white/[0.07] backdrop-blur border border-white/10 rounded-2xl p-3 text-center min-w-0">
                      <div className="text-[28px] md:text-[34px] font-black leading-none text-white tabular-nums" dir="ltr">{formatNumber(c.v)}</div>
                      <div className="text-xs font-black text-white">{c.l}</div>
                      <div className="text-[10px] font-bold tracking-widest text-white/50">{c.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-white text-[#0A0A0B] rounded-2xl p-4">
                  <div className="text-sm font-black leading-relaxed">عمرك هجرياً: <span className="bg-[#0A0A0B] text-white px-2 py-0.5 rounded-full text-xs tabular-nums" dir="ltr">{formatNumber(result.hijriAge.years)} سنة</span> و {formatNumber(result.hijriAge.months)} شهر و {formatNumber(result.hijriAge.days)} يوم</div>
                  <div className="text-[11px] font-bold text-[#52525B] mt-1 break-words">ميلادك هجري: <span className="text-[#0A0A0B]" style={{fontFamily:"'Amiri',serif"}}>{result.hijriBirth.formatted}</span> • اليوم هجري: {result.hijriToday.formatted}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white/10 border border-white/10 rounded-xl p-2.5 text-center backdrop-blur min-w-0"><div className="text-[11px] font-bold text-white/60 truncate">ميلادك ميلادي</div><div className="text-xs font-black truncate">{result.birthStrAr}</div></div>
                  <div className="bg-white text-[#0A0A0B] rounded-xl p-2.5 text-center min-w-0"><div className="text-[11px] font-black truncate">ميلادك هجري</div><div className="text-xs font-black truncate" style={{fontFamily:"'Amiri',serif"}}>{result.hijriBirth.formatted}</div></div>
                </div>
              </div>
            </LiquidSurface>
          </div>

          {/* Golden Alignment — optimized */}
          <div className="relative overflow-hidden rounded-[28px] bg-[#0A0A0B] border border-[#27272A] shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:`url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g fill="none" stroke="white" stroke-width="0.6"><circle cx="50" cy="50" r="18"/><path d="M50 8 L50 22 M50 78 L50 92 M8 50 L22 50 M78 50 L92 50"/><path d="M50 0 L100 50 L50 100 L0 50 Z" opacity="0.4"/></g></svg>')`, backgroundSize:'100px 100px'}}/>
            <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-[#7C3AED]/[0.08] blur-[50px] rounded-full pointer-events-none hidden md:block"/>
            <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-[#C9A86A]/[0.06] blur-[50px] rounded-full pointer-events-none hidden md:block"/>

            <div className="relative">
              <div className="px-5 md:px-8 pt-6 pb-5 border-b border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-3 md:gap-4 min-w-0">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-lg shrink-0">
                      <InfinityIcon className="w-6 h-6 text-white"/>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[18px] md:text-[20px] font-black text-white leading-none">التطابق الذهبي</h3>
                        <span className="bg-white text-[#0A0A0B] text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"><Diamond className="w-3 h-3"/> نادر</span>
                        <span className="hidden sm:inline-flex bg-white/10 border border-white/15 text-white/70 text-[11px] font-bold px-2.5 py-1 rounded-full">≈ كل 33 سنة</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-white/60 mt-2 max-w-[560px]">
                        اليوم الذي يلتقي فيه <span className="text-white font-black">عيد ميلادك الميلادي والهجري</span> في نفس اليوم — السنة الهجرية أقصر بـ 11 يوماً.
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-3 py-2 shrink-0">
                    <span className="w-2 h-2 bg-[#7C3AED] rounded-full animate-pulse"/>
                    <span className="text-xs font-bold text-white/90 truncate">يوم ميلادك: {result.birthGregStr} • {result.hijriBirth.formatted}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-8 py-6">
                <div className="hidden lg:block absolute left-1/2 top-[92px] bottom-[24px] w-[1.5px] bg-white/10 -translate-x-1/2 pointer-events-none"/>
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-[#0A0A0B] items-center justify-center shadow-lg z-10 pointer-events-none">
                  <Link2 className="w-4 h-4 text-[#0A0A0B]"/>
                </div>

                <div className="grid lg:grid-cols-2 gap-4 lg:gap-10 relative">
                  {/* Last */}
                  <div className="order-2 lg:order-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0"><History className="w-3.5 h-3.5 text-white/60"/></span>
                      <span className="text-xs font-black tracking-widest text-white/40">آخر تطابق</span>
                      <span className="mr-auto lg:mr-0 text-[11px] font-bold text-white/30 bg-white/5 border border-white/10 px-2 py-1 rounded-full">الماضي</span>
                    </div>

                    {result.golden.loading ? (
                      <div className="bg-white rounded-[20px] p-6 animate-pulse">
                        <div className="h-4 bg-zinc-100 rounded w-1/3 mb-3"/>
                        <div className="h-6 bg-zinc-100 rounded w-2/3 mb-2"/>
                        <div className="h-4 bg-zinc-100 rounded w-1/2"/>
                      </div>
                    ) : result.golden.lastExact ? (
                      <div className="bg-white rounded-[20px] p-5 shadow-xl relative overflow-hidden min-w-0">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black px-3 py-1 rounded-full mb-3">
                          <Check className="w-3 h-3"/> تطابق تام • {result.golden.lastExact.weekday}
                        </div>
                        <div className="font-black text-[#0A0A0B] text-[16px] leading-tight break-words">{result.golden.lastExact.gregStr}</div>
                        <div className="font-black text-[#7C3AED] text-sm mt-1 break-words" style={{fontFamily:"'Amiri',serif"}}>{result.golden.lastExact.hijriStr}</div>
                        <div className="text-[11px] font-bold text-[#71717A] mt-1 break-words">{result.golden.lastExact.weekdayEn} • فارق 0 يوم</div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-2.5 text-center min-w-0">
                            <div className="text-[11px] font-bold text-[#71717A]">كان عمرك</div>
                            <div className="text-xs font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.golden.lastExact.gregAge.years)} سنة</div>
                            <div className="text-[11px] font-bold text-[#7C3AED]" style={{fontFamily:"'Amiri',serif"}}>{formatNumber(result.golden.lastExact.hijriAge.years)} هـ</div>
                          </div>
                          <div className="bg-[#0A0A0B] rounded-xl p-2.5 text-center text-white min-w-0">
                            <div className="text-[11px] font-bold text-white/60">منذ</div>
                            <div className="text-sm font-black tabular-nums" dir="ltr">{formatNumber(result.golden.lastExact.daysDiff)} يوم</div>
                            <div className="text-[11px] font-bold text-white/50 tabular-nums" dir="ltr">({formatNumber(result.golden.lastExact.yearsDiff)} سنة)</div>
                          </div>
                        </div>
                      </div>
                    ) : result.golden.lastNearest ? (
                      <div className="bg-white rounded-[20px] p-5 shadow-xl min-w-0">
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-black px-3 py-1 rounded-full mb-2">
                          <AlertCircle className="w-3 h-3"/> أقرب اقتراب • فارق {formatNumber(result.golden.lastNearest.distance)} {result.golden.lastNearest.distance===1? 'يوم':'أيام'}
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                          <p className="text-[11px] leading-relaxed font-bold text-amber-800">لم يحدث تطابق تام منذ ميلادك — هذا كان أقرب يوم.</p>
                        </div>
                        <div className="font-black text-[#0A0A0B] text-[16px] leading-tight break-words">{result.golden.lastNearest.gregStr}</div>
                        <div className="text-xs font-bold text-[#52525B] mt-1 break-words">وافق هجرياً: <span className="text-[#7C3AED]" style={{fontFamily:"'Amiri',serif"}}>{result.golden.lastNearest.hijriStr}</span></div>
                        <div className="text-[11px] font-bold text-[#71717A] mt-1.5 bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl px-3 py-2 break-words">
                          عيدك الهجري كان {result.golden.lastNearest.hijriCounterpartGregStr} <span className="text-[#7C3AED]">({result.golden.lastNearest.hijriCounterpartHijriStr})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-2.5 text-center"><div className="text-[11px] font-bold text-[#71717A]">كان عمرك</div><div className="text-xs font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.golden.lastNearest.gregAge.years)} سنة</div></div>
                          <div className="bg-[#0A0A0B] rounded-xl p-2.5 text-center text-white"><div className="text-[11px] font-bold text-white/60">منذ</div><div className="text-sm font-black tabular-nums" dir="ltr">{formatNumber(result.golden.lastNearest.daysDiff)} يوم</div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur border border-white/10 rounded-[20px] p-5 text-center border-dashed">
                        <div className="font-black text-white text-sm">يوم ميلادك هو أول تطابق</div>
                        <div className="text-xs font-bold text-white/60 mt-1 leading-relaxed break-words">{result.golden.birthGregStr} • {result.golden.birthHijriStr}</div>
                      </div>
                    )}
                  </div>

                  {/* Next */}
                  <div className="order-1 lg:order-2 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5 text-white"/></span>
                      <span className="text-xs font-black tracking-widest text-white">التطابق القادم المتوقع</span>
                      <span className="mr-auto lg:mr-0 text-[11px] font-black text-white bg-[#7C3AED] px-2 py-1 rounded-full">قادم ✨</span>
                    </div>

                    {result.golden.loading ? (
                      <div className="bg-white rounded-[20px] p-6 animate-pulse">
                        <div className="h-4 bg-zinc-100 rounded w-1/3 mb-3"/>
                        <div className="h-6 bg-zinc-100 rounded w-2/3 mb-2"/>
                        <div className="h-4 bg-zinc-100 rounded w-1/2"/>
                      </div>
                    ) : result.golden.nextExact ? (
                      <div className="bg-white rounded-[20px] p-5 shadow-xl border-2 border-[#7C3AED]/20 min-w-0">
                        <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-black px-3 py-1 rounded-full mb-3">
                          <Check className="w-3 h-3"/> تطابق تام متوقع • {result.golden.nextExact.weekday}
                        </div>
                        <div className="font-black text-[#0A0A0B] text-[16px] leading-tight break-words">{result.golden.nextExact.gregStr}</div>
                        <div className="font-black text-[#52525B] text-sm mt-1 break-words" style={{fontFamily:"'Amiri',serif"}}>{result.golden.nextExact.hijriStr}</div>
                        <div className="text-[11px] font-bold text-[#71717A] mt-1">سيلتقي التقويمان تماماً</div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="bg-[#0A0A0B] rounded-xl p-2.5 text-center text-white min-w-0">
                            <div className="text-[11px] font-bold text-white/60">سيكون عمرك</div>
                            <div className="text-xs font-black tabular-nums" dir="ltr">{formatNumber(result.golden.nextExact.gregAge.years)} سنة</div>
                          </div>
                          <div className="bg-[#FAFAF9] border-2 border-[#7C3AED]/20 rounded-xl p-2.5 text-center min-w-0">
                            <div className="text-[11px] font-bold text-[#71717A]">بعد</div>
                            <div className="text-sm font-black text-[#0A0A0B] tabular-nums" dir="ltr">{result.golden.nextExact.daysDiff===0 ? "اليوم!" : `${formatNumber(result.golden.nextExact.daysDiff)} يوم`}</div>
                            <div className="text-[11px] font-bold text-[#7C3AED] tabular-nums" dir="ltr">{result.golden.nextExact.daysDiff===0 ? "الآن" : `(${formatNumber(result.golden.nextExact.yearsDiff)} سنة)`}</div>
                          </div>
                        </div>
                      </div>
                    ) : result.golden.nextNearest ? (
                      <div className="bg-white rounded-[20px] p-5 shadow-xl border border-[#E8E6E1] min-w-0">
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-black px-3 py-1 rounded-full mb-2">
                          <Clock className="w-3 h-3"/> أقرب تطابق متوقع • فارق {formatNumber(result.golden.nextNearest.distance)} {result.golden.nextNearest.distance===1?'يوم':'أيام'}
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                          <p className="text-[11px] leading-relaxed font-bold text-amber-800">
                            لا يوجد تطابق تام خلال الـ {formatNumber(result.golden.searchYears)} سنة — هذا أقرب اقتراب بفارق {formatNumber(result.golden.nextNearest.distance)} {result.golden.nextNearest.distance===1?'يوم':'أيام'} فقط.
                          </p>
                        </div>
                        <div className="font-black text-[#0A0A0B] text-[16px] leading-tight break-words">{result.golden.nextNearest.gregStr}</div>
                        <div className="text-xs font-bold text-[#52525B] mt-1 break-words">عيدك الميلادي • يقابله هجرياً: <span className="text-[#7C3AED]" style={{fontFamily:"'Amiri',serif"}}>{result.golden.nextNearest.hijriStr}</span></div>
                        <div className="text-[11px] font-bold text-[#71717A] mt-1.5 bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl px-3 py-2 break-words">
                          عيدك الهجري سيكون {result.golden.nextNearest.hijriCounterpartGregStr} <span className="text-[#7C3AED]">({result.golden.nextNearest.hijriCounterpartHijriStr})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="bg-[#0A0A0B] rounded-xl p-2.5 text-center text-white min-w-0"><div className="text-[11px] font-bold text-white/60">سيكون عمرك</div><div className="text-xs font-black tabular-nums" dir="ltr">{formatNumber(result.golden.nextNearest.gregAge.years)} سنة</div></div>
                          <div className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-2.5 text-center min-w-0"><div className="text-[11px] font-bold text-[#71717A]">بعد</div><div className="text-sm font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.golden.nextNearest.daysDiff)} يوم</div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-[20px] p-5 text-center"><div className="text-sm font-black text-[#0A0A0B]">جاري الحساب...</div></div>
                    )}
                  </div>
                </div>

                <div className="mt-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-white shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-[#0A0A0B]"/></div>
                    <span className="text-xs font-black">لماذا 33 سنة؟</span>
                  </div>
                  <p className="text-xs leading-relaxed font-bold text-white/60">
                    السنة الهجرية 354 يوماً والميلادية 365 يوماً — الفرق 11 يوماً سنوياً. بعد 33 سنة يكتمل الفرق سنة كاملة فيعود التقويمان للالتقاء.
                  </p>
                  <span className="hidden lg:inline-flex shrink-0 bg-white text-[#0A0A0B] text-[11px] font-black px-3 py-1 rounded-full" dir="ltr">{result.golden.loading ? "..." : `${formatNumber(result.golden.totalExactFound)} تطابق في ${formatNumber(result.golden.searchYears)} سنة`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row: birth details + countdown */}
          <div className="grid lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#E8E6E1] rounded-[20px] p-5 shadow-sm min-w-0">
                <div className="flex items-center gap-2 text-[#7C3AED] text-xs font-black tracking-widest mb-3"><Sun className="w-4 h-4"/> يوم ميلادك</div>
                <div className="text-2xl font-black text-[#0A0A0B] break-words">{result.dayNameAr}</div>
                <div className="text-xs font-bold tracking-widest text-[#71717A] break-words" dir="ltr">{result.dayNameEn}</div>
                <div className="mt-3 inline-flex items-center gap-2 bg-[#FAFAF9] border border-[#E8E6E1] rounded-full px-3 py-1.5 text-xs font-bold max-w-full"><span className="w-7 h-7 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-sm shrink-0">🌙</span> <span className="truncate">وُلدت يوم {result.dayNameAr}</span></div>
                <div className="mt-4 bg-[#FAFAF9] border border-[#E8E6E1] rounded-2xl p-3">
                  <div className="text-[11px] font-black text-[#B08D3C] mb-1 flex items-center gap-1"><History className="w-3 h-3"/> حدث تاريخي</div>
                  <p className="text-[13px] leading-relaxed font-bold text-[#0A0A0B] break-words">{historicalPool[result.dayIndex]}</p>
                  <p className="text-[11px] text-[#71717A] mt-2 leading-relaxed break-words">{result.yearContext}</p>
                </div>
              </div>

              <div className="bg-white border border-[#E8E6E1] rounded-[20px] p-5 shadow-sm min-w-0">
                <div className="flex items-center gap-2 text-[#0A0A0B] text-xs font-black tracking-widest mb-3"><Crown className="w-4 h-4 text-[#7C3AED]"/> برجك وصفاتك</div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0A0A0B] text-white flex items-center justify-center text-xl font-black shrink-0">{result.zodiac.icon}</div>
                  <div className="min-w-0">
                    <div className="font-black text-[#0A0A0B] truncate">برج {result.zodiac.name}</div>
                    <div className="text-xs font-bold text-[#7C3AED] truncate">{result.zodiac.desc}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-3 text-center min-w-0"><div className="text-lg">{result.season.icon}</div><div className="text-xs font-black text-[#0A0A0B] truncate">مواليد {result.season.name}</div><div className="text-[11px] text-[#71717A]">فصل الميلاد</div></div>
                  <div className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-3 text-center min-w-0"><div className="text-lg">👥</div><div className="text-xs font-black text-[#0A0A0B] truncate">{result.generation}</div><div className="text-[11px] text-[#71717A] truncate">جيلك</div></div>
                </div>
                <div className="mt-3 text-[11px] font-bold text-[#71717A] bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl px-3 py-2 break-words">📅 {result.birthStrAr} — {result.hijriBirth.formatted}</div>
                <div className="mt-3 bg-[#FFFCF4] border border-[#E8E0C8] rounded-xl px-3 py-2.5 break-words">
                  <div className="text-[11px] font-black text-[#B08D3C] mb-1">ماذا صنع جيلك؟</div>
                  <div className="text-xs font-bold text-[#52525B] leading-relaxed">{result.generationDescription}</div>
                </div>
              </div>
            </div>

            {/* Countdown — isolated */}
            <div className="lg:col-span-5 bg-[#0A0A0B] rounded-[20px] p-[1.5px] shadow-lg min-w-0">
              <div className="bg-white rounded-[18px] p-5 h-full min-w-0">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="inline-flex items-center gap-2 bg-[#0A0A0B] text-white text-xs font-black px-3 py-1.5 rounded-full shrink-0"><Gift className="w-3.5 h-3.5 text-[#7C3AED]"/> عيد ميلادك القادم</div>
                  <span className="text-[11px] font-bold text-[#71717A] bg-[#F4F4F5] border border-[#E4E4E7] px-2.5 py-1 rounded-full shrink-0 truncate">{result.nextGreg.weekday}</span>
                </div>
                <div className="text-sm font-black text-[#0A0A0B] break-words">{result.nextGreg.dateStr}</div>
                <div className="text-xs font-bold text-[#71717A] mb-3 break-words">هجري: {result.nextHijri.hijriStr} — بعد {formatNumber(result.nextHijri.days)} يوم</div>

                <Countdown target={result.nextGreg.date}/>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-3 text-center min-w-0">
                    <div className="text-[11px] font-bold text-[#71717A]">الميلادي القادم</div>
                    <div className="text-sm font-black text-[#0A0A0B] tabular-nums" dir="ltr">{formatNumber(result.nextGreg.days)} يوم</div>
                  </div>
                  <div className="bg-[#0A0A0B] rounded-xl p-3 text-center text-white min-w-0">
                    <div className="text-[11px] font-bold text-white/60">الهجري القادم</div>
                    <div className="text-sm font-black tabular-nums" dir="ltr">{formatNumber(result.nextHijri.days)} يوم</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={copyResult} className="flex-1 h-9 rounded-full bg-[#0A0A0B] text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95"><Copy className="w-3.5 h-3.5"/> نسخ</button>
                  <button onClick={share} className="w-9 h-9 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center hover:bg-white active:scale-95"><Share2 className="w-4 h-4 text-[#0A0A0B]"/></button>
                </div>
              </div>
            </div>
          </div>

          {/* Life in numbers + Planets */}
          <div className="grid lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-white border border-[#E8E6E1] rounded-[20px] p-5 shadow-sm min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0"><Heart className="w-4 h-4 text-white"/></div>
                <div className="font-black text-[#B08D3C]">حياتك بالأرقام</div>
                <span className="mr-auto bg-[#FAFAF9] border border-[#E8E6E1] text-[#71717A] text-[11px] font-bold px-2.5 py-1 rounded-full hidden sm:inline-flex">تقديرية • للمتعة</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {label:"نبضات القلب", value: formatNumber(result.totalDays*101000), sub:"نبضة تقريباً", bg:"bg-[#0A0A0B] text-white"},
                  {label:"أنفاسك", value: formatNumber(result.totalDays*22000), sub:"نفس", bg:"bg-[#7C3AED] text-white"},
                  {label:"ساعات النوم", value: formatNumber(result.totalDays*8), sub:"ساعة نوم", bg:"bg-[#FAFAF9] text-[#0A0A0B] border border-[#E8E6E1]"},
                ].map(s=> (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4 min-w-0`}>
                    <div className="text-[11px] font-bold opacity-70 truncate">{s.label}</div>
                    <div className="text-sm font-black mt-1 tabular-nums break-all" dir="ltr">{s.value}</div>
                    <div className="text-[11px] font-medium opacity-60 truncate">{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  {k:"الثواني", v: formatNumber(result.totalSeconds)},
                  {k:"الدقائق", v: formatNumber(result.totalMinutes)},
                  {k:"الساعات", v: formatNumber(result.totalHours)},
                ].map(x=> (
                  <div key={x.k} className="bg-[#FAFAF9] border border-[#E8E6E1] rounded-xl p-3 text-center min-w-0">
                    <div className="text-[11px] font-bold text-[#71717A] truncate">{x.k}</div>
                    <div className="text-xs font-black text-[#0A0A0B] tabular-nums break-all" dir="ltr">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0A0A0B] rounded-[20px] p-5 text-white relative overflow-hidden border border-white/10 min-w-0">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7C3AED]/20 blur-2xl rounded-full pointer-events-none"/>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3"><Atom className="w-4 h-4 text-[#D4B56A]"/><span className="font-black text-sm">عمرك على الكواكب والقمر</span><span className="mr-auto text-[10px] bg-white/10 border border-white/10 px-2 py-1 rounded-full text-white/60 hidden sm:inline">للمتعة</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {result.planetAges.map(p=> (
                    <div key={p.name} className="bg-white/[0.06] border border-white/10 rounded-xl px-2 py-2 backdrop-blur min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-bold min-w-0"><span className="relative w-8 h-8 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0"><span className="text-[#0A0A0B] text-xs font-black">{p.icon}</span><img src={p.image} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={e=> { e.currentTarget.style.display='none' }}/></span><span className="truncate">{p.name}</span></span>
                      <span className="block text-xs font-black text-[#D4B56A] tabular-nums mt-1" dir="ltr">{p.age} سنة</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-white/40 font-medium mt-3 leading-relaxed">لو عشت على كوكب آخر، كم سيكون عمرك بسنوات ذلك الكوكب؟</div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white border border-[#E8E6E1] rounded-[20px] p-5 shadow-sm min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#0A0A0B] flex items-center justify-center shrink-0"><Hourglass className="w-4 h-4 text-white"/></div>
              <div className="font-black text-[#B08D3C]">محطات حياتك</div>
              <span className="mr-auto text-[11px] font-bold text-[#71717A] bg-[#FAFAF9] border border-[#E8E6E1] px-2.5 py-1 rounded-full">بالأيام</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {result.milestones.map(m=> (
                <div key={m.label} className={`rounded-2xl p-4 border min-w-0 ${m.isPast? "bg-[#F4F4F5] border-[#E4E4E7] opacity-80" : "bg-[#FAFAF9] border-[#E8E6E1]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${m.isPast? "bg-[#0A0A0B] text-white":"bg-[#7C3AED] text-white"}`}>{m.isPast?"تم ✓": (m.daysUntil===0?"اليوم":"قادم")}</span>
                    <span className="text-[11px] font-bold text-[#71717A] tabular-nums shrink-0" dir="ltr">{m.isPast?`منذ ${formatNumber(Math.abs(m.daysUntil))}`:`بعد ${formatNumber(m.daysUntil)}`}</span>
                  </div>
                  <div className="font-black text-[#0A0A0B] mt-2 break-words">{m.title}</div>
                  <div className="text-sm font-black text-[#B08D3C] mt-1 break-words tabular-nums" dir="ltr">{m.label}</div>
                  <div className="text-xs font-bold text-[#52525B] break-words">{m.dateStr}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold text-[#71717A]">
              <span className="flex items-center gap-1.5 bg-[#FAFAF9] border border-[#E8E6E1] rounded-full px-2 py-1.5 justify-center min-w-0"><Baby className="w-3.5 h-3.5 shrink-0"/> طفولتك</span>
              <span className="flex items-center gap-1.5 bg-[#FAFAF9] border border-[#E8E6E1] rounded-full px-2 py-1.5 justify-center min-w-0"><GraduationCap className="w-3.5 h-3.5 shrink-0"/> دراستك</span>
              <span className="flex items-center gap-1.5 bg-[#FAFAF9] border border-[#E8E6E1] rounded-full px-2 py-1.5 justify-center min-w-0"><Briefcase className="w-3.5 h-3.5 shrink-0"/> مسيرتك</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={()=>window.print()} className="bg-white border border-[#E4E4E7] hover:bg-[#FAFAF9] text-[#0A0A0B] rounded-full px-5 py-2.5 text-xs font-black flex items-center gap-2 shadow-sm active:scale-95">
              <Globe className="w-4 h-4"/> طباعة النتيجة
            </button>
            <button onClick={copyResult} className="bg-[#0A0A0B] hover:bg-black text-white rounded-full px-5 py-2.5 text-xs font-black flex items-center gap-2 active:scale-95">
              {copied? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>} نسخ كل التفاصيل
            </button>
          </div>

        </motion.div>
      )}
      </AnimatePresence>

      {/* Features */}
      <section id="features" className="max-w-[1200px] mx-auto px-4 md:px-6 mt-10">
        <div className="text-center max-w-[660px] mx-auto">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E8E6E1] rounded-full px-3 py-1 text-[11px] font-black tracking-widest text-[#71717A] shadow-sm">لماذا يختارنا الجميع؟</div>
          <h2 className="text-[24px] md:text-[30px] font-black leading-tight mt-3 text-[#B08D3C]">كل ما تحتاجه لمعرفة عمرك <span style={{fontFamily:"'Amiri',serif"}}>بدقة وأناقة</span></h2>
          <p className="text-sm text-[#52525B] leading-relaxed mt-2">حاسبة خفيفة وسريعة تجمع الميلادي والهجري والعد التنازلي — مصممة لتكون سلسة حتى على أضعف الهواتف.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            {title:"عمر تفصيلي بالتقويمين", desc:"نحسب سنواتك وشهورك وأيامك بدقة تامة بالميلادي والهجري (أم القرى).", icon: Calculator, color:"bg-[#0A0A0B]"},
            {title:"التطابق الذهبي", desc:"اكتشف متى يلتقي عيد ميلادك الميلادي والهجري — مع آخر مرة والقادمة المتوقعة.", icon: InfinityIcon, color:"bg-[#7C3AED]"},
            {title:"عدّ تنازلي حي", desc:"تابع بالثواني كم بقي لعيد ميلادك القادم — ميلادياً وهجرياً.", icon: Timer, color:"bg-[#18181B]"},
          ].map(f=> (
            <div key={f.title} className="bg-white border border-[#E8E6E1] rounded-[20px] p-6 shadow-sm hover:shadow-md transition min-w-0">
              <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4 shrink-0`}><f.icon className="w-5 h-5 text-white"/></div>
              <div className="font-black text-[#0A0A0B] break-words">{f.title}</div>
              <p className="text-[13px] leading-relaxed text-[#52525B] mt-2 break-words">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            {k:"بدون تسجيل", v:"استخدمها فوراً", icon: Zap},
            {k:"خفيفة جداً", v:"تعمل بسلاسة", icon: Globe},
            {k:"آمنة 100%", v:"على جهازك فقط", icon: Award},
            {k:"مشاركة", v:"بنقرة واحدة", icon: Share2},
          ].map(x=> (
            <div key={x.k} className="bg-[#0A0A0B] text-white rounded-2xl p-4 flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0"><x.icon className="w-4 h-4"/></div>
              <div className="min-w-0"><div className="text-xs font-black truncate">{x.k}</div><div className="text-[11px] text-white/60 truncate">{x.v}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-[1200px] mx-auto px-4 md:px-6 mt-6">
        <div className="bg-white border border-[#E8E6E1] rounded-[24px] p-5 md:p-8 shadow-sm">
          <h3 className="text-lg md:text-xl font-black text-[#B08D3C] flex items-center gap-2"><Clock className="w-5 h-5 text-[#B08D3C]"/> أسئلة شائعة</h3>
          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {[
              {q:"هل الحساب دقيق؟", a:"نعم، نحسب الفرق الحقيقي يوماً بيوم مع مراعاة الكبيسة وتقويم أم القرى."},
              {q:"ما هو التطابق الذهبي؟", a:"هو اليوم الذي يتصادف فيه ميلادك الميلادي والهجري معاً — يحدث مرة كل ~33 سنة. نبحث 100 سنة بدقة."},
              {q:"لماذا بعض التواريخ ليس لها تطابق تام؟", a:"التطابق التام نادر جداً — لبعض التواريخ نعرض أقرب اقتراب بفارق 1-2 يوم مع تاريخيه المحدد."},
              {q:"هل بياناتي تُحفظ؟", a:"لا. كل الحسابات تتم داخل متصفحك فقط — خفيفة وآمنة حتى على الهواتف الضعيفة."},
            ].map(f=> (
              <details key={f.q} className="group bg-[#FAFAF9] border border-[#E8E6E1] rounded-2xl p-4 open:bg-white transition min-w-0">
                <summary className="flex items-center justify-between cursor-pointer list-none font-black text-sm text-[#0A0A0B] gap-2"><span className="break-words">{f.q}</span><ChevronDown className="w-4 h-4 text-[#71717A] group-open:rotate-180 transition shrink-0"/></summary>
                <p className="text-[13px] leading-relaxed text-[#52525B] mt-2 break-words">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 bg-[#0A0A0B] text-white border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-7">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0"><span className="font-black text-[#0A0A0B]">ع</span></div>
              <div className="min-w-0">
                <div className="font-black text-sm">عُـمـري — حاسبة العمر المتكاملة</div>
                <div className="text-xs text-white/50 truncate">دقيق • سريع • خفيف</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-white/70 whitespace-nowrap">© 2026 جميع الحقوق محفوظة</span>
              <span className="hidden sm:inline text-white/20">•</span>
              <span className="bg-white text-[#0A0A0B] font-black rounded-full px-3 py-1.5 whitespace-nowrap">المنشئ: عبدالرحمن محمود أحمد محمد</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`@media print{ header, #calc, #features, #faq, button{ display:none !important } body{ background:white !important} } html{ scroll-behavior:smooth }`}</style>
    </div>
  )
}
