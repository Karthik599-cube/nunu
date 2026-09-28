import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Bell, Settings, Home, TrendingUp, Heart, Plus, Bot, Check,
  Clock, ChevronRight, ChevronLeft, Pill, User, Send, X,
  ArrowLeft, Pencil, Trash2, Phone, Mail, Lock, UserPlus,
  Moon, Sun, Volume2, Globe, Info, Palette, Stethoscope,
  Eye, EyeOff, AlertCircle, CheckCircle2, CalendarDays, CalendarClock,
  Droplets, Activity, Wind, Zap, Minus, LogOut, Sparkles, Key, ExternalLink
} from "lucide-react";
import { GeminiChatModal } from "./components/GeminiChatModal";
import { getGeminiApiKey, saveGeminiApiKey, isGeminiConfigured } from "../services/geminiService";
import { requestNotificationPermission, syncAllNotifications, sendInstantNotification } from "../services/notificationService";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
type AppView = "main" | "profile" | "caretakers" | "family" | "doctor" | "pillbox";
type ActiveNav = "today" | "progress" | "health" | "settings";

interface Caretaker { id: number; name: string; phone: string; }
interface Member { id: number; name: string; }
interface DocAppt { id: number; doctor: string; specialty: string; date: string; time: string; notes: string; }
interface Reminder {
  id: number; label: string; sub: string; time: string; color: string;
  taken: boolean; emoji: string; forMember?: string; date: string;
  skipped?: boolean;
  skipReason?: string;
}
interface WizardState {
  kind: "mainPill" | "memberReminder";
  step: number;
  forMember?: string;
  data: Record<string, string>;
}

interface PillStock {
  name: string;
  stock: number;
  minStock: number;
  type?: string;
}


/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    today: "Today",
    progress: "Progress",
    health: "Health",
    settings: "Settings",
    goodMorning: "Good Morning! 🌿",
    myProgress: "My Progress 📊",
    healthOverview: "Health Overview",
    remainingReminders: "remaining",
    allDone: "All done for today! 🎉",
    done: "done",
    todaysSchedule: "Today's Schedule",
    viewAll: "View all",
    noReminders: "No reminders for today",
    tapPlusToAdd: "Tap + to add a pill schedule",
    take: "Take",
    taken: "Done",
    undo: "Undo",
    askAI: "Ask AI",
    addPill: "Add Pill",
    streak: "Streak",
    adherence: "Adherence",
    missed: "Missed",
    total: "Total",
    weeklyAdherence: "Weekly Adherence",
    hydrationTracker: "Hydration Tracker",
    hydrationGoal: "Goal",
    remaining: "remaining",
    goalReached: "🎉 Goal Reached!",
    reset: "Reset",
    sleepCycle: "Sleep Cycle",
    tonightsQuality: "Tonight's Quality",
    duration: "Duration",
    bedtimeWake: "Bedtime & Wake",
    logSleepData: "Log Sleep Data",
    bloodPressure: "Blood Pressure",
    lastRecorded: "Last recorded",
    systolicDiastolic: "Systolic / Diastolic",
    logNewReading: "Log New Reading",
    heartRate: "Heart Rate",
    avgResting: "Avg Resting",
    currentPulse: "Current Pulse",
    livePulseScanner: "Live pulse scanner",
    healthTip: "Health Tip",
    healthTipDesc: "Regular physical activity, proper hydration, and sleeping 7-8 hours a day can lower blood pressure and help keep your heart healthy.",
    profile: "Profile",
    appAboutUs: "App & About Us",
    displayMode: "Display Mode",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    soundAlerts: "Sound & Alerts",
    customize: "Customize",
    themesAppearance: "Themes & appearance",
    language: "Language",
    caretaker: "Caretaker",
    familyMembers: "Family Members",
    doctorAppointment: "Doctor Appointment",
    upcoming: "upcoming",
    myProfile: "My Profile",
    saveChanges: "Save Changes",
    name: "Name",
    email: "Email",
    password: "Password",
    caretakers: "Caretakers",
    addCaretaker: "Add Caretaker",
    phone: "Phone",
    fullName: "Full Name",
    saveCaretaker: "Save Caretaker",
    relationName: "Name / Relation",
    addMember: "Add Member",
    doctorAppointments: "Doctor Appointments",
    addAppointment: "Add Appointment",
    doctorName: "Doctor Name",
    specialty: "Specialty",
    date: "Date",
    time: "Time",
    notes: "Notes (optional)",
    saveAppointment: "Save Appointment",
    close: "Close",
    aboutText: "Nunu helps you manage your medication schedule, track your health progress, and stay connected with your caretakers and family members.",
    version: "Version 1.0.0",
    madeWith: "Made with ❤️ for better healthcare · © 2026 Nunu",
    pillNameQuest: "Pill name",
    pillTypeQuest: "Pill type",
    pillDoseQuest: "Pills per dose",
    pillFreqQuest: "How many times",
    startDateQuest: "Start date",
    endDateQuest: "End date",
    timesQuest: "Reminder times",
    invQuest: "Inventory",
    stockQuest: "Low stock alert"
  },
  Tamil: {
    today: "இன்று",
    progress: "வளர்ச்சி",
    health: "உடல்நலம்",
    settings: "அமைப்புகள்",
    goodMorning: "காலை வணக்கம்! 🌿",
    myProgress: "என் முன்னேற்றம் 📊",
    healthOverview: "உடல்நலம் கண்ணோട്ടം",
    remainingReminders: "மீதமுள்ளது",
    allDone: "இன்றைய மருந்துகள் முடிந்தது! 🎉",
    done: "முடிந்தது",
    todaysSchedule: "இன்றைய அட்டவணை",
    viewAll: "அனைத்தும் பார்",
    noReminders: "இன்று நினைவூட்டல்கள் இல்லை",
    tapPlusToAdd: "மாத்திரை அட்டவணையைச் சேர்க்க + ஐத் தட்டவும்",
    take: "எடு",
    taken: "முடிந்தது",
    askAI: "ஏஐ கேள்",
    addPill: "மருந்து சேர்",
    streak: "தொடர்ச்சி",
    adherence: "பின்பற்றுதல்",
    missed: "தவறியவை",
    total: "மொத்தம்",
    weeklyAdherence: "வாராந்திர பின்பற்றுதல்",
    hydrationTracker: "நீர்ச்சத்து கண்காணிப்பு",
    hydrationGoal: "இലக்கு",
    remaining: "மீதமுள்ளது",
    goalReached: "🎉 இலக்கை அடைந்தது!",
    reset: "மீட்டமை",
    sleepCycle: "உறக்க சுழற்സി",
    tonightsQuality: "இன்றைய தரம்",
    duration: "நேரம்",
    bedtimeWake: "படுக்கை & விழிப்பு",
    logSleepData: "உறക്കப் பதிவு",
    bloodPressure: "இரத்த அழுத்தம்",
    lastRecorded: "கடைசியாகப் பதிவுசெய்யப்பட்டது",
    systolicDiastolic: "சிஸ்டாலிக் / டയസ്റ്റോലിക്",
    logNewReading: "புதிய பதிவு",
    heartRate: "இதய துடிப்பு",
    avgResting: "சராசரி துடிப்பு",
    currentPulse: "തற்போதைய துடிப்பு",
    livePulseScanner: "നേരടി പൾസ് സ്കാനർ",
    healthTip: "ஆரோக்கிய குறிப்பு",
    healthTipDesc: "வழக்கமான உடற்பயிற்சி, போதுமான தண்ணீர் குடிப்பது மற்றும் 7-8 மணிநேരം தூங்குவது இரத்த அழுத்தத்தைக் குறைத்து இதய ஆரோக்கியத்தைப் பாதுகாக்கும்.",
    profile: "சுயவிவரம்",
    appAboutUs: "செயலி & எங்களைப் பற்றி",
    displayMode: "காட்சி முறை",
    lightMode: "பகல் முறை",
    darkMode: "இரவு முறை",
    soundAlerts: "ஒலி & விழிப்பூட்டல்கள்",
    customize: "தனிப்பயனாக்கு",
    themesAppearance: "தீம்கள் & தோற்றம்",
    language: "மொழி",
    caretaker: "கண்காணிப்பாளர்",
    familyMembers: "குடும்ப உறுப்பினர்கள்",
    doctorAppointment: "மருத்துவர் சந்திப்பு",
    upcoming: "வரവிருக்கும்",
    myProfile: "என் சுயவிவரம்",
    saveChanges: "மாற்றங்களைச் சேமி",
    name: "பெயர்",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    caretakers: "கண்காணிப்பாளர்கள்",
    addCaretaker: "கண்காணிப்பாளரைச் சேர்",
    phone: "தொலைபேசி",
    fullName: "முழு பெயர்",
    saveCaretaker: "கண்காணிப்பாளரைச் சேமி",
    relationName: "பெயர் / உறவு",
    addMember: "உறுப்பினரைச் சேர்",
    doctorAppointments: "மருத்துவர் சந்திப்புகள்",
    addAppointment: "சந்திப்பைச் சேர்",
    doctorName: "மருத்துவர் பெயர்",
    specialty: "சிறப்புத் துறை",
    date: "தேதி",
    time: "நேரம்",
    notes: "குறிப்புகள் (விருப்பம்)",
    saveAppointment: "சந்திப்பைச் சேமி",
    close: "மூடு",
    aboutText: "உங்கள் மருந்து அட்டவணையை நிர்வகிக்கவும், உங்கள் ஆரோக்கிய முன்னேற்றத்தைக் கண்காணிக்கவும், உங்கள் கண்காணிப்பாளர்கள் மற்றும் குடும்ப உறுப்பினர்களுடன் இணைந்திருக்கவும் ஈஸிடோஸ் உதவுகிறது.",
    version: "பதிப்பு 1.0.0",
    madeWith: "ஆரோக்கியமான வாழ்விற்காக ❤️ உடன் உருவாக்கப்பட்டது · © 2026 ஈஸிடோஸ்",
    pillNameQuest: "மாத்திரை பெயர்",
    pillTypeQuest: "மாத்திரை வகை",
    pillDoseQuest: "ஒரு முறைக்கு எத்தனை மாத்திரைகள்",
    pillFreqQuest: "ஒரு நாளைக்கு எத்தனை முறை",
    startDateQuest: "தொடக்க தேதி",
    endDateQuest: "முடிவு தேதி",
    timesQuest: "நினைவூட்டல் நேரங்கள்",
    invQuest: "இருப்பு",
    stockQuest: "குறைந்த இருப்பு எச்சரிக்கை"
  },
  Hindi: {
    today: "आज",
    progress: "प्रगति",
    health: "स्वास्थ्य",
    settings: "सेटिंग्स",
    goodMorning: "शुभ प्रभात! 🌿",
    myProgress: "मेरी प्रगति 📊",
    healthOverview: "स्वास्थ्य अवलोकन",
    remainingReminders: "शेष दवाएं",
    allDone: "आज के लिए सब पूरा हो गया! 🎉",
    done: "पूरा",
    todaysSchedule: "आज की अनुसूची",
    viewAll: "सभी देखें",
    noReminders: "आज कोई अनुसूची नहीं है",
    tapPlusToAdd: "दवा जोड़ने के लिए + दबाएं",
    take: "लें",
    taken: "लिया",
    askAI: "एआई से पूछें",
    addPill: "दवा जोड़ें",
    streak: "सिलसिला",
    adherence: "अनुपालन",
    missed: "छूटी हुई",
    total: "कुल",
    weeklyAdherence: "साप्ताहिक अनुपालन",
    hydrationTracker: "जल सेवन ट्रैकर",
    hydrationGoal: "लक्ष्य",
    remaining: "बचा है",
    goalReached: "🎉 लक्ष्य पूरा हुआ!",
    reset: "रीसेट",
    sleepCycle: "नींद चक्र",
    tonightsQuality: "आज रात की गुणवत्ता",
    duration: "अवधि",
    bedtimeWake: "सोने और जागने का समय",
    logSleepData: "नींद का डेटा दर्ज करें",
    bloodPressure: "रक्तचाप",
    lastRecorded: "पिछला रिकॉर्ड",
    systolicDiastolic: "सिस्टोलिक / डायस्टोलिक",
    logNewReading: "नया रिकॉर्ड दर्ज करें",
    heartRate: "हृदय गति",
    avgResting: "औसत आराम दर",
    currentPulse: "वर्तमान पल्स",
    livePulseScanner: "लाइव पल्स स्कैनर",
    healthTip: "स्वास्थ्य टिप",
    healthTipDesc: "नियमित व्यायाम, उचित जल सेवन और 7-8 घंटे की नींद लेने से रक्तचाप कम हो सकता है और हृदय स्वस्थ रहता है.",
    profile: "प्रोफाइल",
    appAboutUs: "ऐप और हमारे बारे में",
    displayMode: "डिस्प्ले मोड",
    lightMode: "लाइट मोड",
    darkMode: "डार्क मोड",
    soundAlerts: "ध्वनि और अलर्ट",
    customize: "कस्टमाइज़",
    themesAppearance: "थीम्स और लुक",
    language: "भाषा",
    caretaker: "देखभालकर्ता",
    familyMembers: "परिवार के सदस्य",
    doctorAppointment: "डॉक्टर अपॉइंटमेंट",
    upcoming: "आगामी",
    myProfile: "मेरी प्रोफाइल",
    saveChanges: "बदलाव सहेजें",
    name: "नाम",
    email: "ईमेल",
    password: "पासवर्ड",
    caretakers: "देखभालकर्ता",
    addCaretaker: "देखभालकर्ता जोड़ें",
    phone: "फ़ोन",
    fullName: "पूरा नाम",
    saveCaretaker: "देखभालकर्ता सहेजें",
    relationName: "नाम / रिश्ता",
    addMember: "सदस्य जोड़ें",
    doctorAppointments: "डॉक्टर अपॉइंटमेंट",
    addAppointment: "अपॉइंटमेंट जोड़ें",
    doctorName: "डॉक्टर का नाम",
    specialty: "विशेषज्ञता",
    date: "तारीख",
    time: "समय",
    notes: "टिप्पणी (वैकल्पिक)",
    saveAppointment: "अपॉइंटमेंट सहेजें",
    close: "बंद करें",
    aboutText: "ईज़ीडोज़ आपको अपनी दवा की समय-सारणी प्रबंधित करने, अपने स्वास्थ्य की प्रगति पर नज़र रखने और अपने देखभाल करने वालों और परिवार के सदस्यों से जुड़े रहने में मदद करता है।",
    version: "संस्करण 1.0.0",
    madeWith: "बेहतर स्वास्थ्य के लिए ❤️ के साथ बनाया गया · © 2026 ईज़ीडोज़",
    pillNameQuest: "दवा का नाम",
    pillTypeQuest: "दवा का प्रकार",
    pillDoseQuest: "प्रति खुराक कितनी दवा",
    pillFreqQuest: "दिन में कितनी बार",
    startDateQuest: "शुरू होने की तारीख",
    endDateQuest: "समाप्ति तिथि",
    timesQuest: "याद दिलाने का समय",
    invQuest: "इन्वेंटरी",
    stockQuest: "कम स्टॉक अलर्ट"
  },
  Kannada: {
    today: "ಇಂದು",
    progress: "ಪ್ರಗತಿ",
    health: "ಆರೋಗ್ಯ",
    settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    goodMorning: "ಶುಭೋದಯ! 🌿",
    myProgress: "ನನ್ನ ಪ್ರಗತಿ 📊",
    healthOverview: "ಆರೋಗ್ಯದ ವಿವರ",
    remainingReminders: "ಉಳಿದಿದೆ",
    allDone: "ಇಂದಿನ ಮಾತ್ರೆಗಳು ಮುಗಿದಿವೆ! 🎉",
    done: "ಮುಗಿದಿದೆ",
    todaysSchedule: "ಇಂದಿನ ವೇಳಾಪಟ್ಟಿ",
    viewAll: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ",
    noReminders: "ಇಂದು ಯಾವುದೇ ವೇಳಾಪಟ್ಟಿ ಇಲ್ಲ",
    tapPlusToAdd: "ವೇಳಾಪಟ್ಟಿ ಸೇರಿಸಲು + ಒತ್ತಿ",
    take: "ತೆಗೆದುಕೊಳ್ಳಿ",
    taken: "ತೆಗೆದುಕೊಂಡಾಗಿದೆ",
    askAI: "ಎಐ ಕೇಳಿ",
    addPill: "ಮಾತ್ರೆ ಸೇರಿಸಿ",
    streak: "ಸರಣಿ",
    adherence: "ಅನುಸರಣೆ",
    missed: "ತಪ್ಪಿಹೋಗಿದ್ದು",
    total: "ಒಟ್ಟು",
    weeklyAdherence: "ವಾರದ ಅನುಸరణೆ",
    hydrationTracker: "ನೀರಿನ ಟ್ರ್ಯಾಕರ್",
    hydrationGoal: "ಗುರಿ",
    remaining: "ಉಳಿದಿದೆ",
    goalReached: "🎉 ಗುರಿ ತಲುಪಿದೆ!",
    reset: "ಮರುಹೊಂದಿಸಿ",
    sleepCycle: "ನಿದ್ರೆಯ chycle",
    tonightsQuality: "ಇಂದಿನ ಗುಣಮಟ್ಟ",
    duration: "ಅವಧಿ",
    bedtimeWake: "ಮಲಗುವ ಮತ್ತು ಏಳುವ ಸಮಯ",
    logSleepData: "ನಿದ್ರೆಯ ವಿವರ ದಾಖಲಿಸಿ",
    bloodPressure: "ರಕ್ತದೊತ್ತಡ",
    lastRecorded: "ಕೊನೆಯ ದಾಖಲೆ",
    systolicDiastolic: "ಸಿಸ್ಟೊಲಿಕ್ / ಡಯಾಸ್ಟೊಲಿಕ್",
    logNewReading: "ಹೊಸ ದಾಖಲೆ ಸೇರಿಸಿ",
    heartRate: "ಹೃದಯ ಬಡಿತ",
    avgResting: "ಸರಾಸರಿ ಬಡಿತ",
    currentPulse: "ಪ್ರಸ್ತುత ನಾಡಿಮಿಡಿತ",
    livePulseScanner: "ಲೈವ್ ನಾಡಿಮಿಡಿತ ಸ್ಕ್ಯಾನರ್",
    healthTip: "ಆರೋಗ್ಯ ಸಲಹೆ",
    healthTipDesc: "ನಿಯಮಿತ ವ್ಯಾಯಾಮ, ಸರಿಯಾದ ನೀರು ಕುಡಿಯುವುದು ಮತ್ತು 7-8 ಗಂಟೆಗಳ ಕಾಲ ನಿದ್ರಿಸುವುದು ರಕ್ತದೊತ್ತಡವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ ಮತ್ತು ಹೃದಯವನ್ನು ಆರೋಗ್ಯವಾಗಿಡುತ್ತದೆ.",
    profile: "ಪ್ರೊಫೈಲ್",
    appAboutUs: "ಅಪ್ಲಿಕೇಶನ್ ಮತ್ತು ನಮ್ಮ ಬಗ್ಗೆ",
    displayMode: "ಪ್ರದರ್ಶನ ಮೋಡ್",
    lightMode: "ಲೈಟ್ ಮೋഡ്",
    darkMode: "ಡಾರ್ಕ್ ಮೋഡ്",
    soundAlerts: "ಧ್ವನಿ ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳು",
    customize: "ಕಸ್ಟಮೈಸ್",
    themesAppearance: "ಥೀಮ್ಗಳು ಮತ್ತು ವಿನ್ಯಾಸ",
    language: "ಭಾಷೆ",
    caretaker: "ಪಾಲಕರು",
    familyMembers: "ಕುಟುಂಬದ ಸದಸ್ಯರು",
    doctorAppointment: "ವೈದ್ಯರ ಅಪಾಯಿಂಟ್ಮেন্ট",
    upcoming: "ಮುಂಬರುವ",
    myProfile: "ನನ್ನ ಪ್ರೊಫൈಲ್",
    saveChanges: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
    name: "ಹೆಸರು",
    email: "ಇಮೇಲ್",
    password: "ಪಾಸ್ವರ್ഡ്",
    caretakers: "ಪಾಲಕರು",
    addCaretaker: "ಪಾಲಕರನ್ನು ಸೇರಿಸಿ",
    phone: "ಫೋನ್",
    fullName: "ಪೂರ್ಣ ಹೆಸರು",
    saveCaretaker: "ಪಾಲಕರನ್ನು ಉಳಿಸಿ",
    relationName: "ಹೆಸರು / ಸಂಬಂಧ",
    addMember: "ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ",
    doctorAppointments: "ವೈದ್ಯರ ಅಪಾಯಿಂಟ್ಮেন্টಗಳು",
    addAppointment: "ಅಪಾಯಿಂಟ್ಮెంట్ ಸೇರಿಸಿ",
    doctorName: "ವೈದ್ಯರ ಹೆಸರು",
    specialty: "ವಿಶೇಷತೆ",
    date: "ದಿನಾಂక",
    time: "ಸಮಯ",
    notes: "ಟಿಪ್ಪಣಿಗಳು (ಐಚ್ಛಿಕ)",
    saveAppointment: "ಅಪಾಯಿಂಟ್ಮెంట్ ಉಳಿಸಿ",
    close: "ಮುಚ್ಚಿ",
    aboutText: "ನಿಮ್ಮ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ನಿರ್ವಹಿಸಲು, ನಿಮ್ಮ ಆರೋಗ್ಯದ ಪ್ರಗತಿಯನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಮತ್ತು ನಿಮ್ಮ ಪಾಲಕರು ಮತ್ತು ಕುಟುಂಬದ ಸದಸ್ಯರೊಂದಿಗೆ ಸಂಪರ್കದಲ್ಲಿರಲು ಈസിಡೋಸ್ ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
    version: "ಆವೃತ್ತಿ 1.0.0",
    madeWith: "ಉತ್ತಮ ಆರೋಗ್ಯಕ್ಕಾಗಿ ❤️ ನೊಂದಿಗೆ ತಯಾರಿಸಲಾಗಿದೆ · © 2026 ಈಸಿಡೋಸ್",
    pillNameQuest: "ಮಾತ್ರೆಯ ಹೆಸರು",
    pillTypeQuest: "ಮಾತ್ರೆಯ ವಿಧ",
    pillDoseQuest: "ಒಂದು ಬಾರಿಗೆ ಎಷ್ಟು ಮಾತ್ರೆಗಳು",
    pillFreqQuest: "ದಿನಕ್ಕೆ ಎಷ್ಟು ಬಾರಿ",
    startDateQuest: "ಪ್ರಾರಂಭ ದಿನಾಂಕ",
    endDateQuest: "ಮುಕ್ತಾಯ ದಿನಾಂಕ",
    timesQuest: "ಜ್ಞಾಪನೆ ಸಮಯಗಳು",
    invQuest: "ದಾಸ್ತಾನು",
    stockQuest: "ಕಡಿಮೆ ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ"
  },
  Telugu: {
    today: "నేడు",
    progress: "ప్రగతి",
    health: "ఆరోగ్యం",
    settings: "సెట్టింగులు",
    goodMorning: "శుభోదయం! 🌿",
    myProgress: "నా ప్రగతి 📊",
    healthOverview: "ఆరోగ్య అవలోకనం",
    remainingReminders: "మిగిలి ఉన్నాయి",
    allDone: "ఈ రోజుకి అన్నీ పూర్తయ్యాయి! 🎉",
    done: "పూర్తయింది",
    todaysSchedule: "నేటి షెడ్యూల్",
    viewAll: "అన్నీ చూడండి",
    noReminders: "ఈ రోజు రిమైండర్లు లేవు",
    tapPlusToAdd: "షెడ్యూల్ జోడించడానికి + నొక్కండి",
    take: "తీసుకో",
    taken: "తీసుకున్నాను",
    askAI: "ఏఐ అడగండి",
    addPill: "మందు జోడించు",
    streak: "వరుస రోజులు",
    adherence: "అనుసరణ",
    missed: "తప్పినవి",
    total: "మొత్తం",
    weeklyAdherence: "వారపు అనుసరణ",
    hydrationTracker: "నీటి ట్రాకర్",
    hydrationGoal: "లక్ష్యం",
    remaining: "మిగిలి ఉంది",
    goalReached: "🎉 లక్ష్యం చేరింది!",
    reset: "రీసెట్",
    sleepCycle: "నిద్ర చక్రం",
    tonightsQuality: "ఈ రాత్రి నాణ్యత",
    duration: "వ్యవధి",
    bedtimeWake: "పడుకునే & లేచే సమయం",
    logSleepData: "నిద్ర వివరాలు నమోదు చేయి",
    bloodPressure: "రక్తపోటు",
    lastRecorded: "చివరి రికార్డు",
    systolicDiastolic: "సిస్టోలిక్ / డయాస్టోలిక్",
    logNewReading: "కొత్త రికార్డు చేర్చు",
    heartRate: "గుండె వేగం",
    avgResting: "సగటు విశ్రాంతి రేటు",
    currentPulse: "ప్రస్తుత పల్స్",
    livePulseScanner: "లైవ్ పల్സ് స్కానర్",
    healthTip: "ఆరోగ్య చిట్కా",
    healthTipDesc: "క్రమం తప్పకుండా వ్యాయామం చేయడం, తగినంత నీరు తాగడం మరియు 7-8 గంటలు నిద్రపోవడం రక్తపోటును తగ్గిస్తుంది మరియు గుండెను ఆరోగ్యంగా ఉంచుతుంది.",
    profile: "ప్రొఫైల్",
    appAboutUs: "యాప్ & మా గురించి",
    displayMode: "డిస్ప్లే మోడ్",
    lightMode: "లైట్ మోడ్",
    darkMode: "డార్క్ మోడ్",
    soundAlerts: "ధ్వని & అలర్ట్లు",
    customize: "కస్టమైజ్",
    themesAppearance: "థీమ్స్ & రూపురేఖలు",
    language: "భాష",
    caretaker: "సంരక్షకుడు",
    familyMembers: "కుటుంబ సభ్యులు",
    doctorAppointment: "వైద్యుల అపాయింట్‌మెంట్",
    upcoming: "రాబోయేవి",
    myProfile: "నా ప్రొఫైల్",
    saveChanges: "మార్పులు సేవ్ చేయి",
    name: "పేరు",
    email: "ఈమెయిల్",
    password: "పాస్‌వర్డ్",
    caretakers: "సంరక్షకులు",
    addCaretaker: "సంరక్షకుడిని చేర్చు",
    phone: "ఫోన్",
    fullName: "పూర్తి పేరు",
    saveCaretaker: "సంరక్షకుడిని సేవ్ చేయి",
    relationName: "పేరు / బంధుత్వం",
    addMember: "సభ్యుడిని చేర్చు",
    doctorAppointments: "వైద్యుల అపాయింట్‌మెంట్లు",
    addAppointment: "అపాయింట్‌మెంట్ చేర్చు",
    doctorName: "వైద్యుల పేరు",
    specialty: "ప్రత్యేకత",
    date: "తేదీ",
    time: "సమయం",
    notes: "గమనికలు (ఐచ్ఛికం)",
    saveAppointment: "అపాయింట్‌మెంట్ సేవ్ చేయి",
    close: "మూసివేయి",
    aboutText: "మీ మందుల షెడ్యూల్‌ను నిర్వహించడానికి, మీ ఆరోగ్య పురోగతిని ట్రాక్ చేయడానికి మరియు మీ సంరక్షకులు మరియు కుటుంబ సభ్యులతో కనెక్ట్ అవ్వడానికి ఈసిడోస్ మీకు సహాయపడుతుంది.",
    version: "వెర్షన్ 1.0.0",
    madeWith: "మెరుగైన ఆరోగ్యం కోసం ❤️ తో రూపొందించబడింది · © 2026 ఈసిడోస్",
    pillNameQuest: "మందు పేరు",
    pillTypeQuest: "మందు రకం",
    pillDoseQuest: "ఒక మోతాదుకు ఎన్ని మందులు",
    pillFreqQuest: "రోజుకు ఎన్ని సార్లు",
    startDateQuest: "ప్రారంభ తేదీ",
    endDateQuest: "ముగింపు తేదీ",
    timesQuest: "రిమైండర్ సమయాలు",
    invQuest: "ఇన్వెంటరీ",
    stockQuest: "తక్కువ స్టాక్ అలర్ట్"
  },
  Malayalam: {
    today: "ഇന്ന്",
    progress: "പുരോഗതി",
    health: "ആരോഗ്യം",
    settings: "ക്രമീകരണങ്ങൾ",
    goodMorning: "സുപ്രഭാതം! 🌿",
    myProgress: "എന്റെ പുരോഗതി 📊",
    healthOverview: "ആരോഗ്യ വിവരണം",
    remainingReminders: "ബാക്കിയുണ്ട്",
    allDone: "ഇന്നത്തെ മരുന്നുകൾ കഴിഞ്ഞു! 🎉",
    done: "കഴിഞ്ഞു",
    todaysSchedule: "ഇന്നത്തെ ഷെഡ്യൂൾ",
    viewAll: "എല്ലാം കാണുക",
    noReminders: "ഇന്ന് ഓർമ്മപ്പെടുത്തലുകൾ ഒന്നുമില്ല",
    tapPlusToAdd: "മാത്രകളുടെ ഷെഡ്യൂൾ ചേർക്കാൻ + അമർത്തുക",
    take: "കഴിക്കുക",
    taken: "കഴിച്ചു",
    askAI: "എഐ ചോദിക്കുക",
    addPill: "മരുന്ന് ചേർക്കുക",
    streak: "തുടർച്ച",
    adherence: "ക്രമീകരണം",
    missed: "നഷ്ടമായവ",
    total: "ആകെ",
    weeklyAdherence: "പ്രതിവാര ക്രമീകരണം",
    hydrationTracker: "ജലാംശ ട്രാക്കർ",
    hydrationGoal: "ലക്ഷ്യം",
    remaining: "ബാക്കിയുണ്ട്",
    goalReached: "🎉 ലക്ഷ്യം കൈവരിച്ചു!",
    reset: "റീസെറ്റ്",
    sleepCycle: "ഉറക്ക ചക്രം",
    tonightsQuality: "ഇന്നത്തെ ഗുണനിലവാരം",
    duration: "സമയം",
    bedtimeWake: "ഉറങ്ങുന്നതും ഉണരുന്നതുമായ സമയം",
    logSleepData: "ഉറക്ക വിവരങ്ങൾ രേഖപ്പെടുത്തുക",
    bloodPressure: "രക്തസമ്മർദ്ദം",
    lastRecorded: "അവസാനം രേഖപ്പെടുത്തിയത്",
    systolicDiastolic: "സിസ്റ്റോളിക് / ഡയസ്റ്റോളിക്",
    logNewReading: "പുതിയ റീഡിംഗ് ചേർക്കുക",
    heartRate: "ഹൃദയമിടിപ്പ്",
    avgResting: "ശരാശരി നിരക്ക്",
    currentPulse: "നാഡിമിടിപ്പ്",
    livePulseScanner: "ലൈവ് പൾസ് സ്കാനർ",
    healthTip: "ആരോഗ്യ ടിപ്പ്",
    healthTipDesc: "പതിവായുള്ള വ്യായാമം, ആവശ്യത്തിന് വെള്ളം കുടിക്കൽ, 7-8 മണിക്കൂർ ഉറക്കം എന്നിവ രക്തസമ്മർദ്ദം കുറയ്ക്കാനും ഹൃദയാരോഗ്യം മെച്ചപ്പെടുത്താനും സഹായിക്കും.",
    profile: "പ്രൊഫൈൽ",
    appAboutUs: "ആപ്പ് & ഞങ്ങളെക്കുറിച്ച്",
    displayMode: "ഡിസ്പ്ലേ മോഡ്",
    lightMode: "ലൈറ്റ് മോഡ്",
    darkMode: "ഡാർക്ക് മോഡ്",
    soundAlerts: "ശബ്ദം & അലേർട്ടുകൾ",
    customize: "വ്യക്തിഗതമാക്കുക",
    themesAppearance: "തീമുകളും രൂപവും",
    language: "ഭാഷ",
    caretaker: "കെയർടേക്കർ",
    familyMembers: "കുടുംബാംഗങ്ങൾ",
    doctorAppointment: "ഡോക്ടർ അപ്പോയിന്റ്മെന്റ്",
    upcoming: "വരാനിരിക്കുന്നവ",
    myProfile: "എന്റെ പ്രൊഫൈൽ",
    saveChanges: "മാറ്റങ്ങൾ സംരക്ഷിക്കുക",
    name: "പേര്",
    email: "ഇമെയിൽ",
    password: "പാസ്‌വേഡ്",
    caretakers: "കെയർടേക്കർമാർ",
    addCaretaker: "കെയർടേക്കറെ ചേർക്കുക",
    phone: "ഫോൺ",
    fullName: "മുഴുവൻ പേര്",
    saveCaretaker: "കെയർടേക്കറെ സംരക്ഷിക്കുക",
    relationName: "പേര് / ബന്ധം",
    addMember: "അംഗത്തെ ചേർക്കുക",
    doctorAppointments: "ഡോക്ടർ അപ്പോയിന്റ്മെന്റുകൾ",
    addAppointment: "അപ്പോയിന്റ്മെന്റ് ചേർക്കുക",
    doctorName: "ഡോക്ടറുടെ പേര്",
    specialty: "സ്പെഷ്യാലിറ്റി",
    date: "തീയതി",
    time: "സമയം",
    notes: "കുറിപ്പുകൾ (ഓപ്ഷണൽ)",
    saveAppointment: "അപ്പോയിന്റ്മെന്റ് സംരക്ഷിക്കുക",
    close: "അടയ്ക്കുക",
    aboutText: "നിങ്ങളുടെ മരുന്നുകളുടെ ഷെഡ്യൂൾ കൈകാര്യം ചെയ്യാനും ആരോഗ്യ പുരോഗതി നിരീക്ഷിക്കാനും കെയർടേക്കർമാരുമായും കുടുംബാംഗങ്ങളുമായും ബന്ധം നിലനിർത്താനും ഈസിഡോസ് നിങ്ങളെ സഹായിക്കുന്നു.",
    version: "പതിപ്പ് 1.0.0",
    madeWith: "മികച്ച ആരോഗ്യത്തിനായി ❤️ ഓടെ നിർമ്മിച്ചത് · © 2026 ഈസിഡോസ്",
    pillNameQuest: "മരുന്നിന്റെ പേര്",
    pillTypeQuest: "മരുന്നിന്റെ തരം",
    pillDoseQuest: "ഒരു തവണ എത്ര ഗുളികകൾ",
    pillFreqQuest: "ഒരു ദിവസം എത്ര തവണ",
    startDateQuest: "ആരംഭ തീയതി",
    endDateQuest: "അവസാന തീയതി",
    timesQuest: "ഓർമ്മപ്പെടുത്തൽ സമയങ്ങൾ",
    invQuest: "ഇൻവെന്ററി",
    stockQuest: "കുറഞ്ഞ സ്റ്റോക്ക് അലേർട്ട്"
  }
};

const TODAY = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
})();

const getWeekDays = (centerDateStr: string) => {
  const centerDate = new Date(centerDateStr);
  const days = [];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = -15; i <= 15; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${r}`;
    days.push({
      label: dayLabels[d.getDay()],
      date: dateStr,
      dayNum: d.getDate()
    });
  }
  return days;
};

const WEEK = getWeekDays(TODAY);

let pendingSignupName = "";

const REM_TYPES = [
  { key: "pill", emoji: "💊", label: "Pill", unit: "", hint: "" },
  { key: "study", emoji: "📚", label: "Study", unit: "hours", hint: "Duration (hours)" },
  { key: "travel", emoji: "✈️", label: "Travel", unit: "km", hint: "Distance / destination" },
  { key: "bill", emoji: "💳", label: "Bill", unit: "₹", hint: "Amount (₹)" },
  { key: "exercise", emoji: "🏋️", label: "Exercise", unit: "mins", hint: "Duration (minutes)" },
  { key: "water", emoji: "💧", label: "Water", unit: "litres", hint: "Daily goal (litres)" },
  { key: "sleep", emoji: "😴", label: "Sleep", unit: "hours", hint: "Target sleep (hours)" },
  { key: "food", emoji: "🍽️", label: "Food", unit: "meal", hint: "Meal / what to eat" },
  { key: "meditation", emoji: "🧘", label: "Meditation", unit: "mins", hint: "Duration (minutes)" },
  { key: "walk", emoji: "🚶", label: "Walk", unit: "steps", hint: "Target steps" },
  { key: "music", emoji: "🎵", label: "Music", unit: "mins", hint: "Duration (minutes)" },
  { key: "shopping", emoji: "🛍️", label: "Shopping", unit: "items", hint: "What to buy / number of items" },
  { key: "others", emoji: "⭐", label: "Others", unit: "", hint: "" },
];

const PILL_TYPES = ["Tablet", "Capsule", "Injection", "Drops", "Inhaler", "Syrup", "Powder", "Others"];

const FREQ_OPTS = [
  { label: "Once a day", val: "1", count: 1, slots: ["Morning"], key: "freq_once" },
  { label: "Twice a day", val: "2", count: 2, slots: ["Morning", "Evening"], key: "freq_twice" },
  { label: "Three times", val: "3", count: 3, slots: ["Morning", "Afternoon", "Night"], key: "freq_three" },
  { label: "Four times", val: "4", count: 4, slots: ["Morning", "Noon", "Evening", "Night"], key: "freq_four" },
];

const COLORS = ["#008b8b", "#2563eb", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b", "#f43f5e", "#14b8a6", "#84cc16", "#f97316"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const SUGGESTED_PILLS = [
  // A
  "Abacavir", "Acetaminophen", "Acyclovir", "Albuterol", "Aledronate", "Allopurinol", "Alprazolam", "Amiodarone", "Amitriptyline", "Amlodipine", "Amoxicillin", "Amphetamine", "Aspirin", "Atenolol", "Atorvastatin", "Azithromycin",
  // B
  "Baclofen", "Benazepril", "Bisoprolol", "Brimonidine", "Budesonide", "Buprenorphine", "Bupropion", "Buspirone", "Bacitracin", "Benadryl", "Bromocriptine", "Busulfan",
  // C
  "Calcitriol", "Candesartan", "Captopril", "Carbamazepine", "Carvedilol", "Cefdinir", "Celecoxib", "Cephalexin", "Cetirizine", "Ciprofloxacin", "Citalopram", "Clindamycin", "Clobetasol", "Clonazepam", "Clonidine", "Clopidogrel", "Codeine", "Colchicine", "Cyclobenzaprine",
  // D
  "Dapagliflozin", "Desvenlafaxine", "Dexamethasone", "Dexmethylphenidate", "Diazepam", "Diclofenac", "Digoxin", "Diltiazem", "Dolo 550", "Donepezil", "Doxepin", "Doxycycline", "Duloxetine", "Dutasteride",
  // E
  "Empagliflozin", "Enalapril", "Escitalopram", "Esomeprazole", "Estradiol", "Ezetimibe", "Erythromycin", "Etanercept", "Etoposide", "Exenatide", "Everolimus",
  // F
  "Famotidine", "Fenofibrate", "Fentanyl", "Finasteride", "Fluconazole", "Fluoxetine", "Fluticasone", "Folic Acid", "Furosemide", "Foscarnet", "Fludarabine", "Flecainide", "Feosol",
  // G
  "Gabapentin", "Glimepiride", "Glipizide", "Glyburide", "Guaifenesin", "Ganciclovir", "Gemfibrozil", "Glucagon", "Gliclazide", "Griseofulvin",
  // H
  "Haloperidol", "Hydralazine", "Hydrochlorothiazide", "Hydrocodone", "Hydrocortisone", "Hydromorphone", "Hydroxychloroquine", "Hydroxyzine", "Heparin", "Humulin", "Hyaluronate",
  // I
  "Ibuprofen", "Imatinib", "Indomethacin", "Insulin", "Ipratropium", "Irbesartan", "Isosorbide", "Ivermectin", "Imipramine", "Infliximab", "Itraconazole",
  // J
  "Januvia", "Jardiance", "Janumet", "Jolessa", "Jantoven", "Jencycla", "Jentadueto", "Junel", "Juxtapid", "Jakafi",
  // K
  "Ketoconazole", "Ketorolac", "Klonopin", "Keflex", "Klor-Con", "Kenalog", "Kariva", "Kuvan", "Kalydeco", "Kineret",
  // L
  "Labetalol", "Lacosamide", "Lactulose", "Lamotrigine", "Lansoprazole", "Latanoprost", "Levetiracetam", "Levocetirizine", "Levofloxacin", "Levothyroxine", "Lidocaine", "Linagliptin", "Lioresal", "Liraglutide", "Lisinopril", "Lithium", "Lorazepam", "Losartan", "Lovastatin", "Lipitor", "Lyrica",
  // M
  "Meclizine", "Meloxicam", "Memantine", "Metformin", "Methadone", "Methocarbamol", "Methotrexate", "Methylphenidate", "Methylprednisolone", "Metoclopramide", "Metoprolol", "Metronidazole", "Minocycline", "Mirtazapine", "Mometasone", "Montelukast", "Morphine", "Mupirocin", "Mycophenolate", "Midazolam",
  // N
  "Naproxen", "Nebivolol", "Nifedipine", "Nitrofurantoin", "Nitroglycerin", "Nortriptyline", "Nystatin", "Naloxone", "Naltrexone", "Neomycin", "Nexium", "Norvasc",
  // O
  "Olanzapine", "Olmesartan", "Omeprazole", "Ondansetron", "Oseltamivir", "Oxcarbazepine", "Oxybutynin", "Oxycodone", "Oxytocin", "Ofev", "Ortho Tri-Cyclen",
  // P
  "Pantoprazole", "Paracetamol", "Paroxetine", "Penicillin", "Phenobarbital", "Phenytoin", "Pioglitazone", "Polymyxin", "Potassium Chloride", "Pravastatin", "Prazosin", "Prednisolone", "Prednisone", "Pregabalin", "Primidone", "Progesterone", "Promethazine", "Propranolol", "Percocet", "Provigil",
  // Q
  "Quetiapine", "Quinapril", "Quinidine", "Qvar", "Questran", "Qudexy", "Qnasl", "Qtern", "Quillivant", "Quixin",
  // R
  "Rabeprazole", "Ramipril", "Ranitidine", "Risperidone", "Rivaroxaban", "Rizatriptan", "Ropinirole", "Rosuvastatin", "Ritalin", "Remicade", "Restoril",
  // S
  "Salmeterol", "Sertraline", "Sildenafil", "Simvastatin", "Sitagliptin", "Solifenacin", "Spironolactone", "Sumatriptan", "Synthroid", "Singulair", "Sprycel", "Symbicort",
  // T
  "Tadalafil", "Tamsulosin", "Temazepam", "Terazosin", "Terbinafine", "Testosterone", "Thyroxine", "Ticagrelor", "Tizanidine", "Topiramate", "Torsemide", "Tramadol", "Trandolapril", "Trazodone", "Triamcinolone", "Triamterene", "Tegretol", "Trametinib",
  // U
  "Urea", "Uloric", "Ursodiol", "Urecholine", "Urocit-K", "Utibron", "Unasyn", "Umeclidinium", "Upadacitinib", "Ustekinumab",
  // V
  "Valacyclovir", "Valsartan", "Vardenafil", "Venlafaxine", "Verapamil", "Vitamin D3", "Warfarin", "Vicodin", "Viagra", "Valium", "Ventolin", "Vyvanse", "Venofer",
  // W
  "Warfarin", "Welchol", "Wellbutrin", "Westroid", "Wera", "Wixela", "Wakix", "Wegovy", "Winrho", "Wygesic",
  // X
  "Xanax", "Xarelto", "Xalatan", "Xgeva", "Xifaxan", "Xolair", "Xopenex", "Xtandi", "Xyrem", "Xyzal",
  // Y
  "Yasmin", "Yaz", "Yervoy", "Yonsa", "Yupelri", "Yuvafem", "Yohimbine", "Yectam", "Yondelis", "Yspred",
  // Z
  "Zolpidem", "Zonisamide", "Zyrtec", "Zestril", "Zocor", "Zofran", "Zoloft", "Zosyn", "Zyprexa", "Zytiga"
];

const getRelativeDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

const INIT_REMINDERS: Reminder[] = [
  { id: 1, label: "Paracetamol", sub: "2 tablets · After breakfast", time: "08:00 AM", color: "#008b8b", taken: false, emoji: "💊", date: TODAY },
  { id: 2, label: "Dolo 550", sub: "1 tablet · With water", time: "12:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: TODAY },
  { id: 3, label: "Cetirizin", sub: "1 tablet · Before food", time: "06:00 PM", color: "#008b8b", taken: false, emoji: "💊", date: TODAY },
  { id: 4, label: "Vitamin D3", sub: "1 capsule · Before sleep", time: "10:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: TODAY },
  { id: 5, label: "Paracetamol", sub: "2 tablets", time: "08:00 AM", color: "#008b8b", taken: true, emoji: "💊", date: getRelativeDateStr(1) },
  { id: 6, label: "Dolo 550", sub: "1 tablet", time: "12:00 PM", color: "#2563eb", taken: false, emoji: "💊", date: getRelativeDateStr(1) },
  { id: 7, label: "Vitamin D3", sub: "1 capsule", time: "10:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: getRelativeDateStr(1) },
  { id: 8, label: "Paracetamol", sub: "2 tablets", time: "08:00 AM", color: "#008b8b", taken: true, emoji: "💊", date: getRelativeDateStr(2) },
  { id: 9, label: "Cetirizin", sub: "1 tablet", time: "06:00 PM", color: "#008b8b", taken: false, emoji: "💊", date: getRelativeDateStr(2) },
  { id: 10, label: "Dolo 550", sub: "1 tablet", time: "12:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: getRelativeDateStr(3) },
  { id: 11, label: "Vitamin D3", sub: "1 capsule", time: "10:00 PM", color: "#2563eb", taken: false, emoji: "💊", date: getRelativeDateStr(4) },
  { id: 12, label: "Paracetamol", sub: "2 tablets", time: "08:00 AM", color: "#008b8b", taken: true, emoji: "💊", date: getRelativeDateStr(5) },
  { id: 13, label: "Cetirizin", sub: "1 tablet", time: "06:00 PM", color: "#008b8b", taken: true, emoji: "💊", date: getRelativeDateStr(6) },
  { id: 14, label: "Dolo 550", sub: "1 tablet", time: "12:00 PM", color: "#2563eb", taken: false, emoji: "💊", date: getRelativeDateStr(7) },
  { id: 15, label: "Vitamin D3", sub: "1 capsule", time: "10:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: getRelativeDateStr(8) },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/* Custom SVG Icons designed to match Figma references */
function CustomIcon({ name, className = "w-9 h-9" }: { name: string; className?: string }) {
  let n = name.toLowerCase().trim();
  if (n === "simvastatin" || n === "🧪") {
    n = "pill";
  }
  const gradId = `grad-${n.replace(/[^a-z0-9]/g, '')}`;

  let paths = null;
  let viewBox = "0 0 64 64";

  if (n === "⭐" || n === "others" || n === "other" || n === "timer" || n === "clock") {
    paths = (
      <g>
        <circle cx="32" cy="32" r="20" stroke={`url(#${gradId})`} strokeWidth="4" fill="#ffffff" />
        <path d="M32,18 L32,32 L44,32" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="2.5" fill={`url(#${gradId})`} />
      </g>
    );
  } else if (n === "freq_once" || n === "pill" || n === "💊" || n === "capsule") {
    paths = (
      <g transform="rotate(-45 32 32)">
        {/* Shadow/glow behind the capsule */}
        <rect x="12" y="21" width="40" height="22" rx="11" fill={`url(#${gradId})`} opacity="0.15" />

        {/* Left half filled */}
        <path d="M 32,23 L 23,23 A 9,9 0 0,0 23,41 L 32,41 Z" fill={`url(#${gradId})`} />

        {/* Right half (white/light filled) */}
        <path d="M 32,23 L 41,23 A 9,9 0 0,1 41,41 L 32,41 Z" fill="#ffffff" opacity="0.9" />

        {/* Outer outline */}
        <rect x="14" y="23" width="36" height="18" rx="9" stroke={`url(#${gradId})`} strokeWidth="3.5" fill="none" />

        {/* Middle divider */}
        <line x1="32" y1="23" x2="32" y2="41" stroke={`url(#${gradId})`} strokeWidth="3.5" />

        {/* Highlight inner glint */}
        <path d="M 18,28 A 5,5 0 0,1 23,26" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </g>
    );
  } else if (n === "freq_twice") {
    paths = (
      <g>
        {/* Bottle Body */}
        <rect x="14" y="24" width="24" height="32" rx="5" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        {/* Liquid level */}
        <path d="M15.5,40 L36.5,40 L36.5,50 C36.5,52.5 34.5,54.5 32,54.5 L20,54.5 C17.5,54.5 15.5,52.5 15.5,50 Z" fill={`url(#${gradId})`} opacity="0.8" />
        {/* Bottle Neck */}
        <rect x="22" y="16" width="8" height="8" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        {/* Bottle Cap */}
        <rect x="20" y="10" width="12" height="7" rx="1.5" fill={`url(#${gradId})`} />
        {/* Bandage/cross on the bottle */}
        <path d="M22,36 L30,44 M30,36 L22,44" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

        {/* Spoon on the right */}
        <path d="M46,24 C43,24 43,14 46,14 C49,14 49,24 46,24 Z" fill={`url(#${gradId})`} />
        <path d="M46,24 L46,54" stroke={`url(#${gradId})`} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    );
  } else if (n === "freq_three") {
    paths = (
      <g>
        {/* Calendar Card outline */}
        <rect x="10" y="14" width="44" height="42" rx="8" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        {/* Calendar Header bar */}
        <path d="M10,24 L54,24" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        <rect x="10" y="14" width="44" height="10" rx="3" fill={`url(#${gradId})`} opacity="0.15" />
        {/* Binder rings */}
        <rect x="18" y="8" width="4" height="10" rx="2" fill={`url(#${gradId})`} />
        <rect x="42" y="8" width="4" height="10" rx="2" fill={`url(#${gradId})`} />

        {/* Row of 3 Checkmarks */}
        <path d="M16,32 L19,35 L24,30" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M29,32 L32,35 L37,30" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42,32 L45,35 L50,30" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Row of 3 Pills/Capsules at bottom */}
        <g transform="translate(14, 40) scale(0.4)">
          <rect x="0" y="0" width="24" height="12" rx="6" fill={`url(#${gradId})`} />
          <path d="M12,0 L24,0 L24,12 L12,12 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="24" height="12" rx="6" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(27, 40) scale(0.4)">
          <rect x="0" y="0" width="24" height="12" rx="6" fill={`url(#${gradId})`} />
          <path d="M12,0 L24,0 L24,12 L12,12 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="24" height="12" rx="6" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(40, 40) scale(0.4)">
          <rect x="0" y="0" width="24" height="12" rx="6" fill={`url(#${gradId})`} />
          <path d="M12,0 L24,0 L24,12 L12,12 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="24" height="12" rx="6" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
      </g>
    );
  } else if (n === "freq_four") {
    paths = (
      <g>
        {/* Clock circle */}
        <circle cx="22" cy="24" r="14" stroke={`url(#${gradId})`} strokeWidth="3.5" fill="#ffffff" />
        {/* Clock hands */}
        <path d="M22,15 L22,24 L28,24" stroke={`url(#${gradId})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Clock dots */}
        <circle cx="22" cy="24" r="1.5" fill={`url(#${gradId})`} />

        {/* Grid of 4 Pills */}
        <g transform="translate(40, 12) rotate(45) scale(0.45)">
          <rect x="0" y="0" width="26" height="13" rx="6.5" fill={`url(#${gradId})`} />
          <path d="M13,0 L26,0 L26,13 L13,13 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="26" height="13" rx="6.5" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(10, 42) rotate(45) scale(0.45)">
          <rect x="0" y="0" width="26" height="13" rx="6.5" fill={`url(#${gradId})`} />
          <path d="M13,0 L26,0 L26,13 L13,13 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="26" height="13" rx="6.5" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(26, 42) rotate(45) scale(0.45)">
          <rect x="0" y="0" width="26" height="13" rx="6.5" fill={`url(#${gradId})`} />
          <path d="M13,0 L26,0 L26,13 L13,13 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="26" height="13" rx="6.5" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(42, 42) rotate(45) scale(0.45)">
          <rect x="0" y="0" width="26" height="13" rx="6.5" fill={`url(#${gradId})`} />
          <path d="M13,0 L26,0 L26,13 L13,13 Z" fill="#ffffff" opacity="0.8" />
          <rect x="0" y="0" width="26" height="13" rx="6.5" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
        </g>
      </g>
    );
  } else if (n === "tablet") {
    paths = (
      <g transform="rotate(-30 32 32)">
        {/* Glow */}
        <circle cx="32" cy="32" r="16" fill={`url(#${gradId})`} opacity="0.15" />
        {/* Left half */}
        <path d="M 32,16 A 16,16 0 0,0 32,48 Z" fill={`url(#${gradId})`} />
        {/* Right half */}
        <path d="M 32,16 A 16,16 0 0,1 32,48 Z" fill="#ffffff" opacity="0.9" />
        {/* Outline */}
        <circle cx="32" cy="32" r="16" stroke={`url(#${gradId})`} strokeWidth="3.5" fill="none" />
        {/* Groove line */}
        <line x1="32" y1="16" x2="32" y2="48" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        {/* Highlight inner glint */}
        <path d="M 20,24 A 12,12 0 0,1 28,18" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </g>
    );
  } else if (n === "injection") {
    paths = (
      <g transform="rotate(45 32 32)">
        {/* Glow */}
        <rect x="26" y="18" width="12" height="28" rx="2" fill={`url(#${gradId})`} opacity="0.15" />
        {/* Needle */}
        <line x1="32" y1="46" x2="32" y2="58" stroke={`url(#${gradId})`} strokeWidth="3" strokeLinecap="round" />
        {/* Needle hub */}
        <path d="M29,46 L35,46 L32,42 Z" fill={`url(#${gradId})`} />
        {/* Barrel */}
        <rect x="27" y="18" width="10" height="24" rx="2" stroke={`url(#${gradId})`} strokeWidth="3" fill="#ffffff" />
        {/* Liquid level */}
        <rect x="29" y="28" width="6" height="12" fill={`url(#${gradId})`} opacity="0.8" />
        {/* Measurement markings */}
        <line x1="30" y1="23" x2="33" y2="23" stroke={`url(#${gradId})`} strokeWidth="1.5" />
        {/* Plunger shaft */}
        <line x1="32" y1="18" x2="32" y2="8" stroke={`url(#${gradId})`} strokeWidth="3" />
        {/* Plunger top */}
        <line x1="26" y1="8" x2="38" y2="8" stroke={`url(#${gradId})`} strokeWidth="3" strokeLinecap="round" />
        {/* Barrel wings */}
        <line x1="23" y1="18" x2="41" y2="18" stroke={`url(#${gradId})`} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  } else if (n === "drops") {
    paths = (
      <g>
        {/* Dropper bulb */}
        <path d="M42,20 C46,16 52,22 48,26 L43,31 L37,25 Z" fill={`url(#${gradId})`} />
        {/* Pipette body */}
        <path d="M38,26 L23,41 C21,43 19,42 18,40 C17,39 16,37 18,35 L33,20 Z" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3" />
        {/* Liquid inside pipette */}
        <path d="M26,38 L21,43 L20,42 L24,38 Z" fill={`url(#${gradId})`} />
        {/* Droplet */}
        <path d="M14,48 C14,48 18,52 18,55 C18,57 16.5,59 14,59 C11.5,59 10,57 10,55 C10,52 14,48 14,48 Z" fill={`url(#${gradId})`} />
      </g>
    );
  } else if (n === "inhaler") {
    paths = (
      <g>
        {/* Canister on top */}
        <rect x="25" y="10" width="12" height="18" rx="2" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3" />
        <rect x="27" y="20" width="8" height="6" fill={`url(#${gradId})`} />
        {/* L-shaped body */}
        <path d="M21,24 L41,24 L41,40 L49,40 C52,40 54,42 54,45 L54,49 C54,52 52,54 49,54 L33,54 C26,54 21,49 21,42 Z" fill={`url(#${gradId})`} />
        {/* Mouthpiece opening cover/cap detail */}
        <path d="M49,40 L49,54" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </g>
    );
  } else if (n === "syrup") {
    paths = (
      <g>
        {/* Bottle Body */}
        <rect x="18" y="24" width="28" height="32" rx="6" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        {/* Liquid level */}
        <path d="M19.5,40 L44.5,40 L44.5,50 C44.5,53 42,54.5 39,54.5 L27,54.5 C24,54.5 21.5,53 21.5,50 Z" fill={`url(#${gradId})`} opacity="0.8" />
        {/* Bottle Neck */}
        <rect x="26" y="16" width="12" height="8" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        {/* Bottle Cap */}
        <rect x="24" y="10" width="16" height="7" rx="1.5" fill={`url(#${gradId})`} />
        {/* Label on the bottle */}
        <rect x="23" y="30" width="18" height="8" rx="2" fill={`url(#${gradId})`} opacity="0.15" />
      </g>
    );
  } else if (n === "powder") {
    paths = (
      <g>
        {/* Crimped Sachet Body */}
        <rect x="20" y="14" width="24" height="24" rx="2" transform="rotate(45 32 26)" fill="#ffffff" stroke={`url(#${gradId})`} strokeWidth="3" />
        {/* Powder lines/dots falling out */}
        <circle cx="28" cy="46" r="1.5" fill={`url(#${gradId})`} />
        <circle cx="34" cy="48" r="2" fill={`url(#${gradId})`} />
        <circle cx="30" cy="53" r="1.5" fill={`url(#${gradId})`} />
        <circle cx="38" cy="52" r="1.2" fill={`url(#${gradId})`} />
        <circle cx="42" cy="48" r="1.7" fill={`url(#${gradId})`} />
        {/* A line pattern inside the sachet */}
        <path d="M26,20 L40,24" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" transform="rotate(45 32 26)" />
        <path d="M24,28 L38,32" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" transform="rotate(45 32 26)" />
      </g>
    );
  } else if (n === "others") {
    paths = (
      <g>
        {/* Medical Plus */}
        <path d="M14,32 L22,32 M18,28 L18,36" stroke={`url(#${gradId})`} strokeWidth="4.5" strokeLinecap="round" />
        {/* Gear */}
        <circle cx="46" cy="38" r="6" stroke={`url(#${gradId})`} strokeWidth="3" fill="none" />
        <path d="M46,29 L46,32 M46,44 L46,47 M37,38 L40,38 M49,38 L52,38" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
        {/* Question Mark */}
        <path d="M26,18 C26,12 38,12 38,18 C38,22 32,22 32,26 L32,28" fill="none" stroke={`url(#${gradId})`} strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="32" cy="35" r="2.5" fill={`url(#${gradId})`} />
      </g>
    );
  } else if (n === "study" || n === "📚") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <path d="M12,42 L48,42 L52,36 L16,36 Z" />
        <path d="M16,36 A4,4 0 0,0 12,40 L12,44 A4,4 0 0,0 16,48 L52,48 A2,2 0 0,0 54,46 L54,42 A2,2 0 0,0 52,40 L16,40 Z" opacity="0.8" />
        <path d="M12,28 L48,28 L52,22 L16,22 Z" />
        <path d="M16,22 A4,4 0 0,0 12,26 L12,30 A4,4 0 0,0 16,34 L52,34 A2,2 0 0,0 54,32 L54,28 A2,2 0 0,0 52,26 L16,26 Z" opacity="0.9" />
        <path d="M12,14 L48,14 L52,8 L16,8 Z" />
        <path d="M16,8 A4,4 0 0,0 12,12 L12,16 A4,4 0 0,0 16,20 L52,20 A2,2 0 0,0 54,18 L54,14 A2,2 0 0,0 52,12 L16,12 Z" />
        <circle cx="32" cy="14" r="3" fill="#ffffff" />
        <path d="M26,14 A6,3 0 1,1 38,14 A6,3 0 1,1 26,14" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
        <path d="M32,8 A3,6 0 1,1 32,20 A3,6 0 1,1 32,8" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
      </g>
    );
  } else if (n === "travel" || n === "✈️") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <path d="M54,16 L46,12 L28,26 L16,20 L12,24 L24,32 L16,48 L22,50 L34,36 L48,44 L52,40 L42,30 Z" />
        <circle cx="42" cy="23" r="1.5" fill="#ffffff" opacity="0.8" />
        <circle cx="37" cy="25" r="1.5" fill="#ffffff" opacity="0.8" />
        <circle cx="32" cy="27" r="1.5" fill="#ffffff" opacity="0.8" />
      </g>
    );
  } else if (n === "bill" || n === "💳") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <rect x="8" y="16" width="48" height="32" rx="6" />
        <rect x="8" y="22" width="48" height="6" fill="#032B30" opacity="0.3" />
        <rect x="14" y="32" width="10" height="8" rx="2" fill="#ffffff" opacity="0.9" />
        <rect x="28" y="34" width="22" height="4" rx="1" fill="#ffffff" opacity="0.5" />
      </g>
    );
  } else if (n === "exercise" || n === "🏋️" || n === "exercise") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <rect x="12" y="29" width="40" height="6" rx="2" />
        <rect x="16" y="18" width="4" height="28" rx="2" />
        <rect x="20" y="14" width="4" height="36" rx="2" />
        <rect x="44" y="18" width="4" height="28" rx="2" />
        <rect x="40" y="14" width="4" height="36" rx="2" />
        <rect x="8" y="24" width="4" height="16" rx="1" opacity="0.9" />
        <rect x="52" y="24" width="4" height="16" rx="1" opacity="0.9" />
      </g>
    );
  } else if (n === "water" || n === "💧") {
    paths = (
      <g>
        <path d="M32,8 C32,8 50,28 50,40 A18,18 0 1,1 14,40 C14,28 32,8 32,8 Z" fill={`url(#${gradId})`} />
        <path d="M22,38 A12,12 0 0,1 32,20" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </g>
    );
  } else if (n === "sleep" || n === "😴") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <path d="M46,42 A18,18 0 1,1 36,12 A14,14 0 0,0 46,42 Z" />
        <path d="M48,16 L49.5,19 L52.5,19.5 L50,21.5 L51,24.5 L48,23 L45,24.5 L46,21.5 L43.5,19.5 L46.5,19 Z" fill="#ffffff" opacity="0.9" />
        <path d="M24,18 L25,20 L27,20.3 L25.3,21.7 L26,23.7 L24,22.7 L22,23.7 L22.7,21.7 L21,20.3 L23,20 Z" fill="#ffffff" opacity="0.7" />
        <path d="M38,20 L44,20 L38,26 L44,26" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44,28 L49,28 L44,33 L49,33" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      </g>
    );
  } else if (n === "food" || n === "🍽️") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <circle cx="32" cy="32" r="16" />
        <circle cx="32" cy="32" r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
        <path d="M12,18 L12,28 C12,32 15,34 15,38 L15,48 L17,48 L17,38 C17,34 20,32 20,28 L20,18 L18.5,18 L18.5,26 L17.5,26 L17.5,18 L16,18 L16,26 L15,26 L15,18 Z" />
        <path d="M48,18 C46,18 45,22 45,30 L45,36 C45,38 47,40 47,42 L47,48 L49.5,48 L49.5,18 Z" />
      </g>
    );
  } else if (n === "meditation" || n === "🧘") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <path d="M32,10 C24,20 40,20 32,10 M32,10 C40,20 24,20 32,10" opacity="0.4" />
        <path d="M18,36 C24,30 32,42 18,36 M46,36 C40,30 32,42 46,36" opacity="0.4" />
        <circle cx="32" cy="18" r="5" />
        <path d="M32,24 C26,24 24,29 24,34 C28,34 29,29 32,29 C35,29 36,34 40,34 C40,29 38,24 32,24 Z" />
        <path d="M16,42 C16,36 24,36 32,39 C40,36 48,36 48,42 C48,46 40,46 32,44 C24,46 16,46 16,42 Z" opacity="0.9" />
        <circle cx="20" cy="36" r="2" />
        <circle cx="44" cy="36" r="2" />
      </g>
    );
  } else if (n === "walk" || n === "🚶") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <circle cx="36" cy="12" r="5" />
        <path d="M32,19 L26,28 L20,38 L24,40 L29,31 L31,48 L37,48 L34,32 L38,29 L44,38 L48,36 L40,25 Z" />
        <path d="M26,19 C28,21 32,22 35,20 L40,16 L42,18 L36,24 L31,25 Z" opacity="0.9" />
      </g>
    );
  } else if (n === "music" || n === "🎵") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <path d="M22,14 L46,8 L46,36 A8,6 0 1,1 36,40 L36,16 L22,19.5 L22,44 A8,6 0 1,1 12,48 L12,22 A4,4 0 0,1 22,14 Z" />
        <path d="M22,14 L46,8 L46,16 L22,22 Z" opacity="0.8" />
      </g>
    );
  } else if (n === "shopping" || n === "🛍️") {
    paths = (
      <g fill={`url(#${gradId})`}>
        <path d="M14,24 L32,24 L35,50 L11,50 Z" />
        <path d="M18,24 A5,5 0 0,1 28,24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30,30 L46,30 L48,50 L28,50 Z" opacity="0.8" />
        <path d="M34,30 A4,4 0 0,1 42,30" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  } else {
    paths = (
      <g>
        <path d="M32,6 L40.3,22.2 L58.2,24.8 L45.2,37.5 L48.3,55.4 L32,46.8 L15.7,55.4 L18.8,37.5 L5.8,24.8 L23.7,22.2 Z" fill={`url(#${gradId})`} />
        <path d="M32,10 L38,22 L51,24 L41,34 L43,47 L32,41 Z" fill="#ffffff" opacity="0.25" />
      </g>
    );
  }

  return (
    <svg className={className} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="60%" stopColor="#0a7a8f" />
          <stop offset="100%" stopColor="#083344" />
        </linearGradient>
      </defs>
      {paths}
    </svg>
  );
}

function NunuLogo({ className = "h-10", variant = "colored" }: { className?: string; variant?: "colored" | "white" }) {
  return (
    <img src="/nunu_logo.png" className={className} style={{ objectFit: "contain" }} alt="nunu" />
  );
}

function TimeClockPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const defaultTime = value || "09:00";
  const [hhStr, mmStr] = defaultTime.split(":");
  let hhVal = parseInt(hhStr || "9");
  const mmVal = parseInt(mmStr || "00");

  let initialPeriod: "AM" | "PM" = "AM";
  let displayHour = hhVal;
  if (hhVal >= 12) {
    initialPeriod = "PM";
    if (hhVal > 12) displayHour = hhVal - 12;
  }
  if (hhVal === 0) {
    displayHour = 12;
  }

  const [activeTab, setActiveTab] = useState<"hour" | "minute">("hour");
  const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod);

  useEffect(() => {
    const [hS, mS] = (value || "09:00").split(":");
    let hV = parseInt(hS || "9");
    let p: "AM" | "PM" = "AM";
    let dH = hV;
    if (hV >= 12) {
      p = "PM";
      if (hV > 12) dH = hV - 12;
    }
    if (hV === 0) {
      dH = 12;
    }
    setPeriod(p);
  }, [value]);

  const updateTime = (newHour: number, newMin: number, newPeriod: "AM" | "PM") => {
    let finalHour = newHour;
    if (newPeriod === "PM" && newHour < 12) {
      finalHour += 12;
    }
    if (newPeriod === "AM" && newHour === 12) {
      finalHour = 0;
    }
    const finalHourStr = String(finalHour).padStart(2, "0");
    const finalMinStr = String(newMin).padStart(2, "0");
    onChange(`${finalHourStr}:${finalMinStr}`);
  };

  const handleHourSelect = (h: number) => {
    updateTime(h, mmVal, period);
    setActiveTab("minute");
  };

  const handleMinSelect = (m: number) => {
    updateTime(displayHour, m, period);
  };

  const handleHourAdjust = (amount: number) => {
    let nextH = displayHour + amount;
    if (nextH > 12) nextH = 1;
    if (nextH < 1) nextH = 12;
    updateTime(nextH, mmVal, period);
  };

  const handleMinAdjust = (amount: number) => {
    let nextM = mmVal + amount;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 59;
    updateTime(displayHour, nextM, period);
  };

  const handlePeriodChange = (p: "AM" | "PM") => {
    setPeriod(p);
    updateTime(displayHour, mmVal, p);
  };

  const handleClockClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x0 = rect.left + rect.width / 2;
    const y0 = rect.top + rect.height / 2;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;

    let angle = Math.atan2(dx, -dy);
    if (angle < 0) {
      angle += 2 * Math.PI;
    }

    if (activeTab === "hour") {
      let h = Math.round((angle / (2 * Math.PI)) * 12);
      if (h === 0) h = 12;
      handleHourSelect(h);
    } else {
      let m = Math.round((angle / (2 * Math.PI)) * 60) % 60;
      handleMinSelect(m);
    }
  };

  const radius = 68; // Radius for circle positioning (px)
  
  // Calculate hand rotation angle in degrees
  const handAngle = activeTab === "hour" 
    ? displayHour * 30 
    : mmVal * 6;

  return (
    <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-100 dark:border-slate-850 flex flex-col items-center select-none w-full">
      {/* Time Display with Micro Adjustments */}
      <div className="flex items-center gap-4 mb-4 bg-white dark:bg-slate-950 px-5 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850">
        {/* Hour block with adjusters */}
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" onClick={() => handleHourAdjust(1)} className="text-slate-400 hover:text-[#14B8A6] font-bold text-xs p-1 select-none">▲</button>
          <button
            type="button"
            onClick={() => setActiveTab("hour")}
            className={`text-2xl font-extrabold px-3 py-1 rounded-xl transition-all ${
              activeTab === "hour" ? "bg-[#EFF6FF] dark:bg-[#EFF6FF]/10 text-[#14B8A6]" : "text-slate-700 dark:text-slate-350"
            }`}
          >
            {String(displayHour).padStart(2, "0")}
          </button>
          <button type="button" onClick={() => handleHourAdjust(-1)} className="text-slate-400 hover:text-[#14B8A6] font-bold text-xs p-1 select-none">▼</button>
        </div>

        <span className="text-xl font-bold text-slate-300">:</span>

        {/* Minute block with adjusters */}
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" onClick={() => handleMinAdjust(1)} className="text-slate-400 hover:text-[#14B8A6] font-bold text-xs p-1 select-none">▲</button>
          <button
            type="button"
            onClick={() => setActiveTab("minute")}
            className={`text-2xl font-extrabold px-3 py-1 rounded-xl transition-all ${
              activeTab === "minute" ? "bg-[#EFF6FF] dark:bg-[#EFF6FF]/10 text-[#14B8A6]" : "text-slate-700 dark:text-slate-350"
            }`}
          >
            {String(mmVal).padStart(2, "0")}
          </button>
          <button type="button" onClick={() => handleMinAdjust(-1)} className="text-slate-400 hover:text-[#14B8A6] font-bold text-xs p-1 select-none">▼</button>
        </div>

        {/* AM/PM toggle */}
        <div className="flex flex-col ml-1 justify-center">
          <button
            type="button"
            onClick={() => handlePeriodChange("AM")}
            className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-all ${
              period === "AM" ? "bg-teal-500 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("PM")}
            className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-all mt-1 ${
              period === "PM" ? "bg-teal-500 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Clock Face Container */}
      <div 
        onClick={handleClockClick}
        className="relative w-[180px] h-[180px] rounded-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner flex items-center justify-center mb-2 cursor-pointer"
      >
        {/* Center Pin */}
        <div className="absolute w-2.5 h-2.5 rounded-full bg-[#14B8A6] z-20 shadow-md border border-white" />
        
        {/* Clock Hand */}
        <div 
          className="absolute z-10 w-[2px] bg-[#14B8A6] origin-bottom transition-all duration-300 ease-out rounded-full pointer-events-none"
          style={{
            height: `${radius - 12}px`,
            bottom: "50%",
            transform: `translateX(-50%) rotate(${handAngle}deg)`,
            left: "50%"
          }}
        />

        {/* Circular Numbers Layout */}
        {activeTab === "hour" ? (
          Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
            const angle = (h * 30 * Math.PI) / 180;
            const x = Math.sin(angle) * radius;
            const y = -Math.cos(angle) * radius;
            const isSelected = displayHour === h;

            return (
              <button
                key={h}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHourSelect(h);
                }}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                }}
                className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full font-black text-xs transition-all z-20 flex items-center justify-center ${
                  isSelected 
                    ? "bg-[#14B8A6] text-white shadow scale-110" 
                    : "text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                {h}
              </button>
            );
          })
        ) : (
          [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, idx) => {
            const hRepresentation = idx === 0 ? 12 : idx;
            const angle = (hRepresentation * 30 * Math.PI) / 180;
            const x = Math.sin(angle) * radius;
            const y = -Math.cos(angle) * radius;
            const isSelected = Math.round(mmVal / 5) * 5 === m;

            return (
              <button
                key={m}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMinSelect(m);
                }}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                }}
                className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full font-black text-[10px] transition-all z-20 flex items-center justify-center ${
                  isSelected 
                    ? "bg-[#14B8A6] text-white shadow scale-110" 
                    : "text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                {String(m).padStart(2, "0")}
              </button>
            );
          })
        )}
      </div>
      
      <p className="text-[9px] text-slate-450 font-semibold mt-1">
        Tap anywhere on the dial to select exact times
      </p>
    </div>
  );
}

function SInput({ label, value, onChange, placeholder, type = "text", min, hasError, shake }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: string; hasError?: boolean; shake?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (type === "time") {
    return (
      <div className={shake ? "animate-shake" : ""}>
        {label && <p className={`text-xs font-bold mb-1.5 ${hasError ? "text-red-500" : "text-slate-500"}`}>{label}</p>}
        
        {/* Normal text input displaying formatted time */}
        <div className="relative">
          <input
            type="text"
            readOnly
            value={fmtTime(value)}
            onClick={() => setShowPicker(prev => !prev)}
            placeholder={placeholder || "Select time"}
            className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all cursor-pointer select-none"
            style={{
              border: hasError ? "1.5px solid #ef4444" : "1.5px solid rgba(20,184,166,0.15)",
              color: hasError ? "#991b1b" : "#1e293b",
              background: hasError ? "#fef2f2" : "#EFF6FF"
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-xs">
            ⏰
          </div>
        </div>

        {/* Inline Clock picker */}
        {showPicker && (
          <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 animate-in fade-in duration-200">
            <TimeClockPicker value={value || "09:00"} onChange={onChange} />
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-650 active:scale-95 text-white font-extrabold text-xs transition-all text-center"
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={shake ? "animate-shake" : ""}>
      {label && <p className={`text-xs font-bold mb-1 ${hasError ? "text-red-500" : "text-slate-500"}`}>{label}</p>}
      <input type={type} min={min} step={type === "number" ? "any" : undefined} value={value} onChange={e => onChange(e.target.value)}
        placeholder={hasError ? "Please enter a value!" : placeholder}
        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
        style={{
          border: hasError ? "1.5px solid #ef4444" : "1.5px solid rgba(20,184,166,0.15)",
          color: hasError ? "#991b1b" : "#1e293b",
          background: hasError ? "#fef2f2" : "#EFF6FF"
        }} />
    </div>
  );
}

function TimeInputs({ count, slots, data, wUpdate, activeTimeSlot, setActiveTimeSlot }: { 
  count: number; 
  slots: string[]; 
  data: Record<string, string>; 
  wUpdate: (patch: Record<string, any>) => void;
  activeTimeSlot: number;
  setActiveTimeSlot: (v: number) => void;
}) {
  return (
    <div className="space-y-3 mt-2">
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {Array.from({ length: count }).map((_, i) => {
            const val = data[`time_${i}`] || "09:00";
            const isSelected = activeTimeSlot === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveTimeSlot(i)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex-shrink-0 ${
                  isSelected
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                }`}
              >
                {slots[i] || `Slot ${i + 1}`}: {fmtTime(val)}
              </button>
            );
          })}
        </div>
      )}
      <div>
        {count > 1 && (
          <p className="text-xs font-bold text-slate-400 mb-2">
            Adjusting: <span className="text-[#14B8A6]">{slots[activeTimeSlot] || `Slot ${activeTimeSlot + 1}`}</span>
          </p>
        )}
        <TimeClockPicker
          value={data[`time_${activeTimeSlot}`] || "09:00"}
          onChange={val => wUpdate({ [`time_${activeTimeSlot}`]: val })}
        />
      </div>
    </div>
  );
}

function RingProgress({ pct, size = 80, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2, c = 2 * Math.PI * r, d = (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeWidth={stroke}
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray .6s ease" }} />
    </svg>
  );
}

/* option grid for wizard — stable top-level component, styled to match Figma Grid card selector */
function OptionGrid<T extends { label: string; val?: string; key?: string; emoji?: string }>({
  items, dataKey, wizardData, onUpdate,
}: { items: T[]; dataKey: string; wizardData: Record<string, string>; onUpdate: (patch: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 mt-3">
      {items.map(item => {
        const k = item.key ?? item.val ?? item.label;
        const sel = wizardData[dataKey] === k;
        return (
          <button key={k}
            type="button"
            onClick={() => onUpdate({ [dataKey]: k })}
            className="flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-150 active:scale-95 border"
            style={{
              height: "92px",
              background: sel ? "#EFF6FF" : "#ffffff",
              color: sel ? "#14B8A6" : "#1e293b",
              borderColor: sel ? "#14B8A6" : "rgba(0,0,0,0.06)",
              borderWidth: sel ? "2px" : "1px",
              boxShadow: sel ? "0 4px 14px rgba(20,184,166,0.18)" : "0 2px 4px rgba(0,0,0,0.02)"
            }}>
            <div className="w-10 h-10 flex items-center justify-center mb-1">
              <CustomIcon name={k} className="w-9 h-9" />
            </div>
            <span className="text-[11px] font-extrabold truncate w-full text-center">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}


/* Sheet wrapper — stable top-level component */
function Sheet({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(15,23,42,0.5)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[340px] bg-white rounded-[32px] p-6 space-y-4 shadow-2xl" style={{ maxHeight: "85%", overflowY: "auto", scrollbarWidth: "none" }}>
        <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200 mb-1" /></div>
        <h3 className="text-base font-extrabold text-slate-800 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* SubHeader — stable top-level component */
function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
      <button onClick={onBack} className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center">
        <ArrowLeft className="w-5 h-5 text-slate-600" />
      </button>
      <h1 className="text-base font-extrabold text-slate-800">{title}</h1>
    </div>
  );
}

function fmtTime(val: string): string {
  if (!val) return "09:00 AM";
  const [h, m] = val.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM", h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${p}`;
}

function getEmojiChar(emojiOrType: string): string {
  if (!emojiOrType) return "💊";
  if (emojiOrType.length <= 2) return emojiOrType; // already an emoji char
  const t = emojiOrType.toLowerCase();
  if (t === "drops") return "💧";
  if (t === "syrup") return "🧪";
  if (t === "injection") return "💉";
  if (t === "inhaler") return "💨";
  if (t === "powder") return "🧂";
  if (t === "tablet") return "💊";
  if (t === "capsule") return "💊";
  return "💊";
}

function renderWizardIcon(emo: string) {
  if (!emo) return null;
  const nameMap: Record<string, string> = {
    "💊": "pill",
    "🧪": "syrup",
    "💧": "drops",
    "💉": "injection",
    "💨": "inhaler",
    "🧂": "powder",
  };
  const iconName = nameMap[emo];
  if (iconName) {
    return (
      <div className="flex justify-center mb-3">
        <CustomIcon name={iconName} className="w-14 h-14" />
      </div>
    );
  }
  return <div className="text-4xl mb-2 text-center">{emo}</div>;
}

async function validateEmailDomain(email: string): Promise<{ valid: boolean; reason?: string }> {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return { valid: false, reason: "Invalid email format." };

  // Block common disposable email domains
  const disposableDomains = [
    "mailinator.com", "yopmail.com", "10minutemail.com", "tempmail.com", 
    "dispostable.com", "guerrillamail.com", "sharklasers.com", "trashmail.com"
  ];
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: "Temporary or disposable emails are not allowed." };
  }

  try {
    // Query Google DNS over HTTPS to verify the domain has MX (Mail Exchange) records
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    const data = await res.json();
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      return { valid: true };
    }
    return { valid: false, reason: `The domain "${domain}" is not configured to receive emails.` };
  } catch (err) {
    // If the network/DNS check fails, default to valid so we don't block users due to connection issues
    return { valid: true };
  }
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1]);
  const min = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour * 60 + min;
}

function playPreviewSound(soundName: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (soundName === "chime") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (soundName === "beep") {
      osc.type = "square";
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.setValueAtTime(0, now + 0.08);
      gain.gain.setValueAtTime(0.15, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (soundName === "gentle") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.75);
    } else if (soundName === "digital") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.setValueAtTime(1800, now + 0.05);
      osc.frequency.setValueAtTime(2100, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {
    console.error("AudioContext failed to start:", e);
  }
}

const isPillAlreadyStocked = (pillName?: string, stocks?: PillStock[]) => {
  if (!pillName || !stocks) return false;
  return stocks.some((s: any) => s.name && s.name.toLowerCase() === pillName.trim().toLowerCase());
};

/* wizard step counts */
function totalSteps(w: WizardState, stocks?: PillStock[]): number {
  if (w.kind === "mainPill") {
    if (w.data.choice === "other") return 4;
    if (w.data.choice === "appointment") return 5;
    if (w.data.choice === "medicine") {
      return isPillAlreadyStocked(w.data.pillName, stocks) ? 8 : 10;
    }
    return 1; // choice selection screen is step 0
  }
  const t = w.data.reminderType;
  if (!t) return 1;                  // step 0 = type select
  if (t === "pill") {
    return isPillAlreadyStocked(w.data.pillName, stocks) ? 8 : 10;
  }
  if (t === "others") return 3;        // 0=type,1=describe,2=datetime
  return 3;                         // 0=type,1=notes,2=datetime
}
function isLastStep(w: WizardState, stocks?: PillStock[]): boolean { return w.step === totalSteps(w, stocks) - 1; }

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   AUTHENTICATION VIEW (Login / Sign Up)
═══════════════════════════════════════════════════════════ */
function AuthView({ showToast, t, setSession }: { showToast: (msg: string, type?: 'error' | 'success') => void, t: (key: string) => string, setSession: React.Dispatch<React.SetStateAction<any>> }) {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [showAuthPass, setShowAuthPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [signupModeStep, setSignupModeStep] = useState<"questions" | "credentials">("questions");
  const [tempAge, setTempAge] = useState(28);
  const [tempGender, setTempGender] = useState("male");
  const [tempGoals, setTempGoals] = useState<string[]>(["meds", "water"]);

  function handleGuestSignUp() {
    const guestUser = {
      id: "guest_user",
      email: "guest@easydose.com",
      user_metadata: {
        name: authName || "Guest User"
      }
    };
    const guestSession = {
      user: guestUser,
      access_token: "guest_token",
      refresh_token: "guest_refresh_token"
    };

    // Save guest onboarding data locally
    const userId = "guest_user";
    const onboardingData = {
      onboarded: true,
      name: authName || "Guest User",
      age: tempAge,
      gender: tempGender,
      reminders: [],
      caretakers: [],
      members: [],
      appointments: [],
      waterIntake: 0,
      sleepHours: 0,
      sleepQuality: 0,
      bedtime: "",
      waketime: "",
      bpSystolic: 0,
      bpDiastolic: 0,
      heartRate: 0,
      heartRateHistory: []
    };
    localStorage.setItem(`easydose_data_${userId}`, JSON.stringify(onboardingData));
    localStorage.setItem(`pill_stocks_${userId}`, JSON.stringify([]));

    // Save mock session locally to persist login
    localStorage.setItem("easy_dose_mock_session", JSON.stringify(guestSession));

    // Set active session in state
    setSession(guestSession);
    showToast("Logged in as Guest!", "success");
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      showToast("Please fill in all fields", "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail.trim())) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (authPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }
    if (authMode === "signup" && !authName) {
      showToast("Please enter your name", "error");
      return;
    }

    setLoading(true);
    try {
      if (authMode === "signup") {
        const domainCheck = await validateEmailDomain(authEmail);
        if (!domainCheck.valid) {
          showToast(domainCheck.reason || "Invalid email domain.", "error");
          setLoading(false);
          return;
        }
      }

      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) {
          console.error("Login error:", error);
          showToast(error.message, "error");
        } else {
          showToast("Successfully logged in!", "success");
        }
      } else {
        // Check if email already exists in public profile table
        const { data: existingUser } = await supabase
          .from("profile")
          .select("id")
          .eq("email", authEmail.trim().toLowerCase())
          .maybeSingle();

        if (existingUser) {
          showToast("This email is already registered. Please log in instead.", "error");
          setLoading(false);
          return;
        }

        pendingSignupName = authName;
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              name: authName,
            }
          }
        });
        if (error) {
          console.error("Signup error:", error);
          showToast(error.message, "error");
        } else {
          const userId = data.user?.id;
          if (userId) {
            const onboardingData = {
              onboarded: true,
              name: authName,
              age: tempAge,
              gender: tempGender,
              reminders: [],
              caretakers: [],
              members: [],
              appointments: [],
              waterIntake: 0,
              sleepHours: 0,
              sleepQuality: 0,
              bedtime: "",
              waketime: "",
              bpSystolic: 0,
              bpDiastolic: 0,
              heartRate: 0,
              heartRateHistory: []
            };
            localStorage.setItem(`easydose_data_${userId}`, JSON.stringify(onboardingData));
            localStorage.setItem(`pill_stocks_${userId}`, JSON.stringify([]));

            supabase.from("profile").upsert({ id: userId, name: authName, email: authEmail, password: "" }).then(({ error }) => {
              if (error) console.error("Error upserting profile:", error);
            });
          }

          if (data.user && data.session === null) {
            showToast("Registration successful! Please check your email for the confirmation link to activate your account.", "success");
            setAuthMode("login");
          } else {
            showToast("Registration successful!", "success");
          }
        }
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      showToast(err.message || "An authentication error occurred", "error");
    } finally {
      setLoading(false);
    }
  }

  if (authMode === "signup" && signupModeStep === "questions") {
    return (
      <OnboardingView
        session={null}
        onComplete={(data) => {
          setAuthName(data.name);
          setTempAge(data.age);
          setTempGender(data.gender);
          setTempGoals(data.goals);
          setSignupModeStep("credentials");
        }}
        t={t}
        onBack={() => setAuthMode("login")}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="relative pt-12 pb-8 px-6 flex-shrink-0 flex flex-col items-center text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg,#14B8A6 0%,#0ea5a0 55%,#0891b2 100%)" }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-white" style={{ transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10 bg-white" style={{ transform: "translate(-20%,20%)" }} />

        <NunuLogo className="h-28 w-auto mb-2" variant="white" />
        <p className="text-white/70 text-xs mt-1 max-w-[220px]">
          Your personal smart medication reminder & health assistant
        </p>
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6 py-6 flex flex-col justify-between">
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4">
            <button type="button" onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 ${authMode === "login" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              Sign In
            </button>
            <button type="button" onClick={() => { setAuthMode("signup"); setSignupModeStep("questions"); }}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 ${authMode === "signup" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              Create Account
            </button>
          </div>

          {authMode === "signup" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5" />Full Name</label>
              <input type="text" placeholder="John Doe"
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border focus:border-[#14B8A6] transition-colors"
                style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                value={authName} onChange={e => setAuthName(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email Address</label>
            <input type="email" placeholder="example@mail.com"
              className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border focus:border-[#14B8A6] transition-colors"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
              value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {authMode === "signup" ? "Set Password" : "Password"}
            </label>
            <div className="relative">
              <input type={showAuthPass ? "text" : "password"} placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-2xl text-sm font-semibold outline-none border focus:border-[#14B8A6] transition-colors"
                style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
              <button type="button" onClick={() => setShowAuthPass(!showAuthPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showAuthPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 mt-2 rounded-2xl text-sm font-extrabold text-white flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
            style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)", boxShadow: "0 6px 20px rgba(20,184,166,0.3)" }}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              authMode === "login" ? "Sign In" : "Sign Up"
            )}
          </button>

          {authMode === "signup" && (
            <div className="flex flex-col items-center gap-2 mt-4 w-full">
              <div className="flex items-center gap-2 w-full my-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">or</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <button type="button" onClick={handleGuestSignUp}
                className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-[#14B8A6] border-2 border-[#14B8A6]/20 bg-white hover:bg-teal-50/50 flex items-center justify-center gap-2 active:scale-95 transition-all duration-200">
                <Sparkles className="w-4 h-4 text-[#14B8A6]" />
                Sign Up as Guest
              </button>
            </div>
          )}
        </form>

        {/* Footer Info */}
        <div className="text-center text-[10px] text-slate-400 mt-6 leading-relaxed">
          By continuing, you agree to Nunu's terms and privacy policies.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING VIEW (First-time user questionnaire & animated Dosey)
 ═══════════════════════════════════════════════════════════ */
function OnboardingView({ session, onComplete, t, onBack }: { session: any, onComplete: (data: { name: string, age: number, gender: string, goals: string[] }) => void, t: any, onBack?: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(session?.user?.user_metadata?.name || "");
  const [isTyping, setIsTyping] = useState(false);
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState("male");
  const [goals, setGoals] = useState<string[]>(["meds", "water"]);

  const toggleGoal = (g: string) => {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const handleNext = () => {
    if (step === 0 && !name.trim()) return;
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete({ name, age, gender, goals });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc]">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1.5deg); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes write {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(3px, -3px) rotate(6deg); }
          50% { transform: translate(-1px, 2px) rotate(-4deg); }
          75% { transform: translate(4px, 1px) rotate(3deg); }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-blink { animation: blink 3s ease-in-out infinite; transform-origin: center; }
        .animate-write { animation: write 0.3s ease-in-out infinite; }
        .animate-wave { animation: wave 1s ease-in-out infinite; }
      `}</style>

      {/* Header with progress */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        {step > 0 || onBack ? (
          <button onClick={handleBack} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
        ) : (
          <div className="w-8" />
        )}
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-1.5 rounded-full transition-all ${step >= 0 ? "bg-[#14B8A6]" : "bg-slate-200"}`} />
          <div className={`w-6 h-1.5 rounded-full transition-all ${step >= 1 ? "bg-[#14B8A6]" : "bg-slate-200"}`} />
          <div className={`w-6 h-1.5 rounded-full transition-all ${step >= 2 ? "bg-[#14B8A6]" : "bg-slate-200"}`} />
        </div>
        <div className="w-8" />
      </div>

      {/* Dosey Interactive Character Area */}
      <div className="flex flex-col items-center justify-center pt-2 pb-6 px-6">
        <div className="relative w-48 h-44 flex items-center justify-center animate-float">
          {/* Dosey Main Robot Body */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 relative shadow-lg border-2 border-white/50 flex items-center justify-center">
            {/* Antenna */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-1.5 h-4 bg-teal-500" />
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-pulse shadow-md shadow-amber-300" />
            </div>
            {/* Screen Face */}
            <div className="w-[74px] h-[58px] rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center gap-3 relative overflow-hidden">
              {/* Scanline light effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />
              {/* Digital Eyes */}
              <svg className="w-10 h-3 flex justify-between">
                <circle cx="6" cy="6" r="4.5" fill="#2dd4bf" className="animate-blink" />
                <circle cx="34" cy="6" r="4.5" fill="#2dd4bf" className="animate-blink" />
              </svg>
            </div>
            {/* Soft shadow on body */}
            <div className="absolute bottom-1 w-16 h-3 rounded-full bg-black/10 blur-[1px]" />
          </div>

          {/* Dosey's Clipboard */}
          <div className="absolute -bottom-1 -left-2 w-28 h-32 bg-amber-50 border-2 border-slate-700/10 rounded-2xl p-2.5 shadow-xl transform -rotate-12 flex flex-col justify-between">
            {/* Clipboard clip */}
            <div className="w-10 h-3.5 bg-slate-400 border border-slate-500/20 rounded-t absolute -top-1.5 left-1/2 -translate-x-1/2" />

            {/* Writing paper preview */}
            <div className="space-y-1 mt-1.5 flex-1">
              <div className="w-full h-1 bg-slate-200 rounded" />
              <div className="w-4/5 h-1 bg-slate-200 rounded" />

              {/* Handwritten User Name Output */}
              {name && (
                <div className="pt-2 text-center text-[11px] font-serif italic text-teal-800 font-bold overflow-hidden whitespace-nowrap text-ellipsis animate-in fade-in zoom-in-75 duration-300">
                  {name}
                </div>
              )}

              {/* Squiggly doodle path showing when typing */}
              {isTyping && (
                <svg className="w-full h-8 text-teal-600/30 animate-pulse mt-1" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10,15 Q20,5 30,15 T50,15 T70,15 T90,15" strokeDasharray="4 2" />
                </svg>
              )}
            </div>
            {/* Small decorative heart */}
            <div className="text-right text-[8px] text-teal-400">♥</div>
          </div>

          {/* Dosey's Pencil / Hand */}
          <div className={`absolute bottom-3 -right-2 w-10 h-10 ${isTyping ? "animate-write" : "animate-float"}`} style={{ transformOrigin: "bottom right" }}>
            {/* Hand joint */}
            <div className="w-5 h-5 rounded-full bg-teal-400 border border-white/50 absolute bottom-0 right-0 shadow" />
            {/* Pencil */}
            <div className="w-2.5 h-10 bg-amber-400 rounded-t border-x border-amber-500 absolute -top-4 left-1 transform -rotate-45">
              {/* Eraser */}
              <div className="w-2.5 h-2 bg-pink-400 rounded-t" />
              {/* Tip */}
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-slate-800 absolute -bottom-1 left-0 transform rotate-180" />
            </div>
          </div>
        </div>

        {/* Dynamic Bubble text */}
        <div className="mt-4 px-4 py-3 bg-teal-50 border border-teal-100 rounded-2xl text-center relative max-w-[280px] shadow-sm animate-in fade-in slide-in-from-bottom-2">
          {/* Speak pointer */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-teal-50 border-t border-l border-teal-100 transform rotate-45" />
          <p className="text-xs font-bold text-teal-900 leading-snug">
            {step === 0 && (name ? `Writing it down... Nice to meet you, ${name}! 📝` : "Hi, I'm Dosey! Let's set up your profile. What is your name? 👋")}
            {step === 1 && `Perfect, ${name}! Tell me your age and gender so I can tune your goals.`}
            {step === 2 && `Final step! What can I help you keep track of, ${name}?`}
          </p>
        </div>
      </div>

      {/* Steps Inputs container */}
      <div className="flex-1 px-6 flex flex-col justify-between pb-8">
        <div className="flex-1 flex flex-col justify-center">
          {step === 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1 uppercase tracking-wider"><User className="w-3.5 h-3.5 text-teal-500" />Your Name</label>
              <input type="text" placeholder="e.g. Karthik"
                className="w-full px-5 py-4 rounded-2xl text-sm font-semibold outline-none border focus:border-[#14B8A6] transition-all bg-white shadow-sm"
                style={{ borderColor: "#e2e8f0" }}
                value={name}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                onChange={e => {
                  setName(e.target.value);
                  setIsTyping(true);
                  setTimeout(() => setIsTyping(false), 800);
                }}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Age select slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1 uppercase tracking-wider"><CalendarDays className="w-3.5 h-3.5 text-teal-500" />Age</label>
                  <span className="text-sm font-extrabold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{age} years</span>
                </div>
                <input type="range" min="1" max="100" value={age} onChange={e => setAge(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#14B8A6]" />
              </div>

              {/* Gender selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Gender</label>
                <div className="grid grid-cols-3 gap-3">
                  {["male", "female", "other"].map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`py-3.5 text-xs font-bold rounded-2xl border transition-all ${gender === g ? "bg-teal-50 border-teal-500 text-teal-700 shadow-sm" : "bg-white border-slate-100 text-slate-500"}`}>
                      {g === "male" ? "Male ♂" : g === "female" ? "Female ♀" : "Other ⚧"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Focus Areas (Select all that apply)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "meds", label: "Medications", icon: "💊", desc: "Pill schedules" },
                  { id: "water", label: "Hydration", icon: "💧", desc: "Water intake tracker" },
                  { id: "sleep", label: "Sleep Tracker", icon: "💤", desc: "Hours & bedtime" },
                  { id: "heart", label: "Heart Rate & BP", icon: "🩺", desc: "Vital metrics" }
                ].map(g => {
                  const selected = goals.includes(g.id);
                  return (
                    <button key={g.id} type="button" onClick={() => toggleGoal(g.id)}
                      className={`p-3.5 text-left rounded-2xl border transition-all flex flex-col gap-1.5 ${selected ? "bg-teal-50 border-teal-500 text-teal-900 shadow-sm" : "bg-white border-slate-100 text-slate-500"}`}>
                      <span className="text-xl">{g.icon}</span>
                      <span className="text-xs font-extrabold text-slate-800">{g.label}</span>
                      <span className="text-[9px] text-slate-400">{g.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button onClick={handleNext} disabled={step === 0 && !name.trim()}
          className="w-full py-4 mt-6 rounded-2xl text-sm font-extrabold text-white flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)", boxShadow: "0 6px 20px rgba(20,184,166,0.3)" }}>
          {step === 2 ? "Let's Go! 🚀" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  /* ── Gemini AI Assistant State ───────────────────────────── */
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());

  /* ── authentication ──────────────────────────────────────── */
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTimeSlot, setActiveTimeSlot] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  /* ── settings ────────────────────────────────────────────── */
  const [settings, setSettings] = useState({
    mode: "light",
    sound: true,
    language: "English",
    notificationType: "notification", // "alarm" or "notification"
    notificationSound: "default" // "default", "chime", "beep", "gentle", "digital"
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [tempNotificationType, setTempNotificationType] = useState<string>("notification");
  const [tempNotificationSound, setTempNotificationSound] = useState<string>("default");

  const currentLang = settings.language || "English";
  const t = (key: string) => {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.English[key] || key;
  };

  useEffect(() => {
    if (settings.mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.mode]);


  /* ── navigation ─────────────────────────────────────────── */
  const [view, setView] = useState<AppView>("main");
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const showToast = (message: any, type: 'error' | 'success' = 'error') => {
    let msg = "";
    if (!message) {
      msg = type === "error" ? "An unexpected error occurred." : "Success!";
    } else if (typeof message === "object") {
      msg = message.message || message.error_description || JSON.stringify(message);
    } else {
      msg = String(message).trim();
    }

    if (msg === "{}" || msg === "") {
      msg = "Failed to send verification email. Please verify your custom SMTP configuration in your Supabase dashboard.";
    }

    setToast({ message: msg, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [activeNav, setActiveNav] = useState<ActiveNav>("today");
  const [activeDay, setActiveDay] = useState(TODAY);

  const calendarActiveRef = useRef<HTMLButtonElement>(null);



  const [calDay, setCalDay] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);

  const prevMonth = () => {
    setCalDay(null);
    setCurrentMonth(m => {
      if (m === 1) {
        setCurrentYear(y => y - 1);
        return 12;
      }
      return m - 1;
    });
  };

  const nextMonth = () => {
    setCalDay(null);
    setCurrentMonth(m => {
      if (m === 12) {
        setCurrentYear(y => y + 1);
        return 1;
      }
      return m + 1;
    });
  };

  /* ── profile ─────────────────────────────────────────────── */
  const [profile, setProfile] = useState({ name: "Karthik", email: "karthik@easydose.app", password: "mypassword", age: 28, gender: "male" });
  const [editP, setEditP] = useState({ ...profile, showPass: false });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  /* ── caretakers ──────────────────────────────────────────── */
  const [caretakers, setCaretakers] = useState<Caretaker[]>([
    { id: 1, name: "Priya Sharma", phone: "+91 98765 43210" },
    { id: 2, name: "Ravi Kumar", phone: "+91 87654 32109" },
  ]);
  const [newCT, setNewCT] = useState({ name: "", phone: "" });
  const [showAddCT, setShowAddCT] = useState(false);

  /* ── family ──────────────────────────────────────────────── */
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "Amma (Mom)" },
    { id: 2, name: "Appa (Dad)" },
  ]);
  const [newMName, setNewMName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  /* ── doctor ──────────────────────────────────────────────── */
  const [appointments, setAppointments] = useState<DocAppt[]>([
    { id: 1, doctor: "Dr. Arun Raj", specialty: "Cardiologist", date: "2026-06-28", time: "10:00", notes: "Regular checkup" },
    { id: 2, doctor: "Dr. Meena V", specialty: "Neurologist", date: "2026-07-05", time: "14:00", notes: "Follow-up" },
  ]);
  const [newAppt, setNewAppt] = useState({ doctor: "", specialty: "", date: "", time: "", notes: "" });
  const [showAddAppt, setShowAddAppt] = useState(false);

  /* ── reminders / wizard ──────────────────────────────────── */
  const [reminders, setReminders] = useState<Reminder[]>(INIT_REMINDERS);
  const [customPillNames, setCustomPillNames] = useState<string[]>([]);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [wizardError, setWizardError] = useState(false);
  const [shakeWizard, setShakeWizard] = useState(false);
  const [rescheduleRem, setRescheduleRem] = useState<Reminder | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<DocAppt | null>(null);
  const [activeApptNotification, setActiveApptNotification] = useState<DocAppt | null>(null);
  const [notifiedAppts, setNotifiedAppts] = useState<string[]>([]);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [reschedEndDate, setReschedEndDate] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [deletingRem, setDeletingRem] = useState<Reminder | null>(null);

  const [pillStocks, setPillStocks] = useState<PillStock[]>([]);
  const [showPillBox, setShowPillBox] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStockName, setEditingStockName] = useState<string | null>(null);
  const [newStockPill, setNewStockPill] = useState({ name: "", stock: "", minStock: "", type: "Tablet" });

  useEffect(() => {
    if (isLoaded && session?.user?.id) {
      localStorage.setItem(`pill_stocks_${session.user.id}`, JSON.stringify(pillStocks));
    }
  }, [pillStocks, isLoaded, session]);


  const [showNotif, setShowNotif] = useState(false);
  const [activeLiveNotification, setActiveLiveNotification] = useState<Reminder | null>(null);
  const [activeSleepAlarm, setActiveSleepAlarm] = useState<"sleep" | "wakeup" | null>(null);
  const [snoozeTargetTime, setSnoozeTargetTime] = useState<number | null>(null);
  const [snoozeAlarmType, setSnoozeAlarmType] = useState<"sleep" | "wakeup" | null>(null);
  const [showSnoozeSelection, setShowSnoozeSelection] = useState<boolean>(false);
  const [skippingReminder, setSkippingReminder] = useState<Reminder | null>(null);
  const [notifiedReminders, setNotifiedReminders] = useState<string[]>([]);
  const [notifiedSleepAlarms, setNotifiedSleepAlarms] = useState<string[]>([]);

  const snoozeOptions = [
    { label: "5m", val: 5 },
    { label: "10m", val: 10 },
    { label: "15m", val: 15 },
    { label: "30m", val: 30 },
    { label: "1h", val: 60 }
  ];

  const handleSnoozeClick = (mins: number) => {
    const target = Date.now() + mins * 60 * 1000;
    setSnoozeTargetTime(target);
    setSnoozeAlarmType(activeSleepAlarm);
    setActiveSleepAlarm(null);
    setShowSnoozeSelection(false);
    showToast(`Alarm snoozed for ${mins} minutes`, "success");
  };
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMsgs, setAiMsgs] = useState([
    { role: "ai", text: "Hi! 👋 I'm your Nunu AI. Ask me anything about your medications, dosage, or side effects." },
  ]);

  useEffect(() => {
    if (profile.name) {
      setAiMsgs(prev => {
        if (prev.length === 1 && prev[0].role === "ai" && (prev[0].text.startsWith("Hi!") || prev[0].text.includes("Karthik"))) {
          return [
            { role: "ai", text: `Hi ${profile.name}! 👋 I'm your Nunu AI. Ask me anything about your medications, dosage, or side effects.` }
          ];
        }
        return prev;
      });
    }
  }, [profile.name]);

  useEffect(() => {
    if (view === "main" && activeNav === "today") {
      const timer = setTimeout(() => {
        const activeBtn = calendarActiveRef.current;
        if (activeBtn) {
          const flexContainer = activeBtn.parentElement;
          const scrollContainer = flexContainer?.parentElement;
          if (scrollContainer) {
            const left = activeBtn.offsetLeft - scrollContainer.offsetWidth / 2 + activeBtn.offsetWidth / 2;
            scrollContainer.scrollTo({ left, behavior: "auto" });
          }
        }
      }, 350); // Give enough time for loading re-renders to settle
      return () => clearTimeout(timer);
    }
  }, [activeDay, view, activeNav, reminders]);

  // Sync mobile APK local notifications
  useEffect(() => {
    if (reminders && reminders.length > 0) {
      syncAllNotifications(reminders);
    }
  }, [reminders]);

  /* ── health trackers state ───────────────────────────────── */
  const [waterIntake, setWaterIntake] = useState(1450); // in ml
  const [waterTarget] = useState(2500); // in ml

  const [sleepHours, setSleepHours] = useState(7.2);
  const [sleepQuality, setSleepQuality] = useState(84);
  const [bedtime, setBedtime] = useState("22:30");
  const [waketime, setWaketime] = useState("06:00");
  const [showLogSleep, setShowLogSleep] = useState(false);

  const [bpSystolic, setBpSystolic] = useState(118);
  const [bpDiastolic, setBpDiastolic] = useState(76);
  const [showLogBP, setShowLogBP] = useState(false);

  const [heartRate, setHeartRate] = useState(72);
  const [heartRateHistory, setHeartRateHistory] = useState<number[]>([68, 70, 72, 74, 71, 73, 72]);
  const [tempHeartRate, setTempHeartRate] = useState(72);
  const [showPulseScanner, setShowPulseScanner] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "complete">("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [tempSystolic, setTempSystolic] = useState(118);
  const [tempDiastolic, setTempDiastolic] = useState(76);

  const scanTimerRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else {
        const localSession = localStorage.getItem("easy_dose_mock_session");
        if (localSession) {
          try {
            setSession(JSON.parse(localSession));
          } catch (e) {
            console.error(e);
          }
        }
      }
      setCheckingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        localStorage.removeItem("easy_dose_mock_session");
      }
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error("Supabase signOut error:", err);
    }
    
    // Always clear local session and states regardless of server success
    localStorage.removeItem("easy_dose_mock_session");
    setSession(null);
    setView("main");

    // Clear React states completely to avoid memory leaking to next logged in user
    setIsLoaded(false);
    setProfile({ name: "Karthik", email: "karthik@easydose.app", password: "mypassword", age: 28, gender: "male" });
    setReminders([]);
    setCustomPillNames([]);
    setCaretakers([]);
    setMembers([]);
    setAppointments([]);
    setPillStocks([]);
    setWaterIntake(1500);
    setSleepHours(7.0);
    setSleepQuality(80);
    setBedtime("");
    setWaketime("");
    setBpSystolic(0);
    setBpDiastolic(0);
    setHeartRate(0);
    setHeartRateHistory([]);

    showToast("Logged out successfully", "success");
  }

  useEffect(() => {
    if (!session?.user?.id) {
      // If no active session, clear states
      setIsLoaded(false);
      setProfile({ name: "Karthik", email: "karthik@easydose.app", password: "mypassword", age: 28, gender: "male" });
      setReminders([]);
      setCaretakers([]);
      setMembers([]);
      setAppointments([]);
      setPillStocks([]);
      return;
    }

    // Immediately clear previous user's data states to prevent leakage before new data loads
    setIsLoaded(false);
    setProfile({ name: "Karthik", email: "karthik@easydose.app", password: "mypassword", age: 28, gender: "male" });
    setReminders([]);
    setCaretakers([]);
    setMembers([]);
    setAppointments([]);
    setPillStocks([]);
    setWaterIntake(0);
    setSleepHours(0);
    setSleepQuality(0);
    setBedtime("");
    setWaketime("");
    setBpSystolic(0);
    setBpDiastolic(0);
    setHeartRate(0);
    setHeartRateHistory([]);

    async function loadData() {
      try {
        // 1. Profile Load/Create
        let userProfile = null;
        let profileExists = false;
        try {
          const profileRes = await supabase.from("profile").select("*").eq("id", session.user.id).maybeSingle();
          if (profileRes.data) {
            userProfile = profileRes.data;
            profileExists = true;
          } else {
            const signupName = pendingSignupName || session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User";
            const newProfile = {
              id: session.user.id,
              name: signupName,
              email: session.user.email || "",
              password: ""
            };
            const { data: insertedProfile, error: insertError } = await supabase.from("profile").insert([newProfile]).select().maybeSingle();
            if (!insertError && insertedProfile) {
              userProfile = insertedProfile;
            } else {
              userProfile = newProfile;
            }
          }
        } catch (profileErr) {
          console.error("Profile load error, fallback to mock:", profileErr);
          const signupName = pendingSignupName || session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User";
          userProfile = {
            name: signupName,
            email: session.user.email || "",
            password: ""
          };
        }

        // 2. Load reminders, caretakers, members, appointments, and health from user-specific local storage
        let localAge = 28;
        let localGender = "male";
        let localName = "";
        let hasLocalData = false;

        const localDataStr = localStorage.getItem(`easydose_data_${session.user.id}`);
        let onboardedVal = true;
        if (localDataStr) {
          try {
            const d = JSON.parse(localDataStr);
            onboardedVal = d.onboarded !== false;
            if (d.age) localAge = d.age;
            if (d.gender) localGender = d.gender;
            if (d.name) localName = d.name;
            hasLocalData = true;

            if (d.reminders) {
              const isDefaultRems = Array.isArray(d.reminders) && d.reminders.length === 16 &&
                d.reminders.some(r => r.label === "Paracetamol") &&
                d.reminders.some(r => r.label === "Dolo 550");
              if (isDefaultRems) {
                setReminders([]);
              } else {
                setReminders(d.reminders);
              }
            }
            if (d.caretakers) setCaretakers(d.caretakers);
            if (d.members) setMembers(d.members);
            if (d.appointments) setAppointments(d.appointments);
            if (d.waterIntake !== undefined) setWaterIntake(d.waterIntake);
            if (d.sleepHours !== undefined) setSleepHours(d.sleepHours);
            if (d.sleepQuality !== undefined) setSleepQuality(d.sleepQuality);
            if (d.bedtime !== undefined) setBedtime(d.bedtime);
            if (d.waketime !== undefined) setWaketime(d.waketime);
            if (d.bpSystolic !== undefined) setBpSystolic(d.bpSystolic);
            if (d.bpDiastolic !== undefined) setBpDiastolic(d.bpDiastolic);
            if (d.heartRate !== undefined) setHeartRate(d.heartRate);
            if (d.heartRateHistory !== undefined) setHeartRateHistory(d.heartRateHistory);
          } catch (e) {
            console.error("Local load error:", e);
          }
        } else {
          setReminders([]);
          setCaretakers([]);
          setMembers([]);
          setAppointments([]);
          setWaterIntake(0);
          setSleepHours(0);
          setSleepQuality(0);
          setBedtime("");
          setWaketime("");
          setBpSystolic(0);
          setBpDiastolic(0);
          setHeartRate(0);
          setHeartRateHistory([]);
        }
        setOnboarded(onboardedVal);

        // Apply profile setup
        if (userProfile) {
          const mergedProfile = {
            ...userProfile,
            name: localName || userProfile.name,
            age: localAge,
            gender: localGender
          };
          console.log("[loadData Debug] User ID:", session.user.id);
          console.log("[loadData Debug] User Profile from DB:", userProfile);
          console.log("[loadData Debug] Local Name loaded:", localName);
          console.log("[loadData Debug] Final Merged Profile:", mergedProfile);
          setProfile(mergedProfile);
          setEditP({ ...mergedProfile, showPass: false });
          pendingSignupName = "";
        }

        // Load pill stocks for the specific user
        const savedStocks = localStorage.getItem(`pill_stocks_${session.user.id}`);
        if (savedStocks) {
          try {
            const parsed = JSON.parse(savedStocks);
            const isOldDefault = Array.isArray(parsed) && parsed.length === 4 &&
              parsed.some(p => p.name === "Paracetamol" && p.stock === 12) &&
              parsed.some(p => p.name === "Dolo 550" && p.stock === 25) &&
              parsed.some(p => p.name === "Cetirizin" && p.stock === 8) &&
              parsed.some(p => p.name === "Vitamin D3" && p.stock === 30);

            if (isOldDefault) {
              setPillStocks([]);
            } else {
              setPillStocks(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          // If no local data exists, new signup starts with completely 0 pills!
          setPillStocks([]);
        }

        // Load custom typed pill names for search suggestions (shared globally)
        const savedCustomPills = localStorage.getItem("custom_pills_shared");
        if (savedCustomPills) {
          try {
            setCustomPillNames(JSON.parse(savedCustomPills));
          } catch (e) {
            console.error(e);
          }
        } else {
          setCustomPillNames([]);
        }
      } catch (err) {
        console.error("Error loading data from Supabase:", err);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, [session]);

  useEffect(() => {
    if (isLoaded && session?.user?.id) {
      const timer = setTimeout(async () => {
        try {
          const { error } = await supabase.from("health").update({
            water_intake: waterIntake,
            sleep_hours: sleepHours,
            sleep_quality: sleepQuality,
            bedtime,
            waketime,
            bp_systolic: bpSystolic,
            bp_diastolic: bpDiastolic,
            heart_rate: heartRate,
            heart_rate_history: heartRateHistory
          }).eq("user_id", session.user.id);

          if (error) {
            await supabase.from("health").update({
              water_intake: waterIntake,
              sleep_hours: sleepHours,
              sleep_quality: sleepQuality,
              bedtime,
              waketime,
              bp_systolic: bpSystolic,
              bp_diastolic: bpDiastolic,
              heart_rate: heartRate,
              heart_rate_history: heartRateHistory
            }).eq("id", session.user.id);
          }
        } catch (err) {
          console.error("Error auto-saving health to Supabase:", err);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [waterIntake, sleepHours, sleepQuality, bedtime, waketime, bpSystolic, bpDiastolic, heartRate, heartRateHistory, isLoaded, session]);

  useEffect(() => {
    if (isLoaded && session?.user?.id) {
      const data = {
        onboarded,
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        reminders,
        caretakers,
        members,
        appointments,
        waterIntake,
        sleepHours,
        sleepQuality,
        bedtime,
        waketime,
        bpSystolic,
        bpDiastolic,
        heartRate,
        heartRateHistory
      };
      localStorage.setItem(`easydose_data_${session.user.id}`, JSON.stringify(data));
    }
  }, [
    onboarded,
    profile,
    reminders,
    caretakers,
    members,
    appointments,
    waterIntake,
    sleepHours,
    sleepQuality,
    bedtime,
    waketime,
    bpSystolic,
    bpDiastolic,
    heartRate,
    heartRateHistory,
    isLoaded,
    session
  ]);
  // Live Notifications Check Engine
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    const interval = setInterval(() => {
      if (!isLoaded || !session?.user?.id) return;
      
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const dVal = String(now.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${dVal}`;

      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentMinStr = `${currentHours.toString().padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`;
      
      const curP = currentHours >= 12 ? "PM" : "AM";
      const curH12 = currentHours === 0 ? 12 : currentHours > 12 ? currentHours - 12 : currentHours;
      const curFormattedTime = `${curH12.toString().padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")} ${curP}`;

      const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();

      console.log(`[Notification Engine] Checking: today=${todayStr}, time=${curFormattedTime} (alt: ${currentMinStr}). Active Reminders:`, reminders.filter(r => !r.taken).map(r => `${r.label} at ${r.date} ${r.time}`));

      // Check Bedtime Alarm
      if (bedtime) {
        const key = `sleep_${todayStr}_${bedtime}`;
        if (!notifiedSleepAlarms.includes(key) && currentMinStr === bedtime) {
          setNotifiedSleepAlarms(prev => [...prev, key]);
          setActiveSleepAlarm("sleep");
          setShowSnoozeSelection(false);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Sleep Cycle Alert", {
              body: "it's time to sleep",
              icon: "/favicon.ico"
            });
          }
        }
      }

      // Check Wake Up Alarm
      if (waketime) {
        const key = `wakeup_${todayStr}_${waketime}`;
        if (!notifiedSleepAlarms.includes(key) && currentMinStr === waketime) {
          setNotifiedSleepAlarms(prev => [...prev, key]);
          setActiveSleepAlarm("wakeup");
          setShowSnoozeSelection(false);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Sleep Cycle Alert", {
              body: "its time to wakeup",
              icon: "/favicon.ico"
            });
          }
        }
      }

      // Check Snoozed Alarm
      if (snoozeTargetTime && Date.now() >= snoozeTargetTime && snoozeAlarmType) {
        setActiveSleepAlarm(snoozeAlarmType);
        setSnoozeTargetTime(null);
        setSnoozeAlarmType(null);
        setShowSnoozeSelection(false);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Sleep Cycle Alert", {
            body: snoozeAlarmType === "sleep" ? "it's time to sleep" : "its time to wakeup",
            icon: "/favicon.ico"
          });
        }
      }

      // Check Doctor Appointments
      const activeAppt = appointments.find(a => {
        if (a.date !== todayStr) return false;
        if (notifiedAppts.includes(`${a.id}_${a.time}`)) return false;
        
        return norm(a.time) === norm(currentMinStr) || norm(a.time) === norm(curFormattedTime);
      });

      if (activeAppt) {
        setNotifiedAppts(prev => [...prev, `${activeAppt.id}_${activeAppt.time}`]);
        setActiveApptNotification(activeAppt);
        
        if (settings.sound) {
          playPreviewSound(settings.notificationSound || "default");
        }

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Doctor Appointment Alert", {
            body: `You have an appointment now with ${activeAppt.doctor} (${activeAppt.specialty})!`,
            icon: "/favicon.ico"
          });
        }
      }

      const activeRem = reminders.find(r => {
        if (r.taken || r.date !== todayStr) return false;
        if (notifiedReminders.includes(`${r.id}_${r.time}`)) return false;
        
        return norm(r.time) === norm(curFormattedTime) || norm(r.time) === norm(currentMinStr);
      });

      if (activeRem) {
        setNotifiedReminders(prev => [...prev, `${activeRem.id}_${activeRem.time}`]);
        setActiveLiveNotification(activeRem);
        
        const isAlarm = activeRem.alarmMode === true || activeRem.alarmMode === "true" || settings.notificationType === "alarm";
        if (settings.sound && !isAlarm) {
          playPreviewSound(settings.notificationSound || "default");
        }

        sendInstantNotification("💊 Nunu Reminder", `It's time to take your ${activeRem.label} (${activeRem.sub || ""})!`);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Nunu Reminder", {
            body: `It's time to take your ${activeRem.label} (${activeRem.sub || ""})!`,
            icon: "/favicon.ico"
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [reminders, notifiedReminders, isLoaded, session, settings, bedtime, waketime, notifiedSleepAlarms, snoozeTargetTime, snoozeAlarmType, appointments, notifiedAppts]);

  // Continuous Alarm Audio loop
  useEffect(() => {
    let intervalId: any = null;
    const isAlarm = activeLiveNotification && (activeLiveNotification.alarmMode === true || activeLiveNotification.alarmMode === "true" || settings.notificationType === "alarm");
    const isSleepAlarm = activeSleepAlarm !== null;
    if (settings.sound && (isAlarm || isSleepAlarm)) {
      // Play immediately
      playPreviewSound(settings.notificationSound || "default");
      // Repeat every 1.5 seconds
      intervalId = setInterval(() => {
        playPreviewSound(settings.notificationSound || "default");
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeLiveNotification, activeSleepAlarm, settings.sound, settings.notificationSound, settings.notificationType]);

  const startScanning = () => {
    if (scanState === "complete") {
      setScanProgress(0);
    }
    setScanState("scanning");
    setScanProgress(0);

    scanTimerRef.current = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(scanTimerRef.current);
          setScanState("complete");
          const finalBpm = Math.floor(Math.random() * (85 - 65 + 1)) + 65;
          setHeartRate(finalBpm);
          setHeartRateHistory(h => [...h.slice(1), finalBpm]);
          return 100;
        }
        return prev + 4;
      });
    }, 100);
  };

  const stopScanning = () => {
    if (scanState === "scanning") {
      clearInterval(scanTimerRef.current);
      setScanState("idle");
      setScanProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // moved below the `settings` state declaration to avoid TDZ
  }, []);

  function calculateHours(bed: string, wake: string): number {
    if (!bed || !wake) return 0;
    try {
      const partsBed = bed.split(":");
      const partsWake = wake.split(":");
      if (partsBed.length < 2 || partsWake.length < 2) return 0;
      const bh = Number(partsBed[0]);
      const bm = Number(partsBed[1]);
      const wh = Number(partsWake[0]);
      const wm = Number(partsWake[1]);
      if (isNaN(bh) || isNaN(bm) || isNaN(wh) || isNaN(wm)) return 0;
      let bedMins = bh * 60 + bm;
      let wakeMins = wh * 60 + wm;
      if (wakeMins < bedMins) {
        wakeMins += 24 * 60;
      }
      return Math.round(((wakeMins - bedMins) / 60) * 10) / 10;
    } catch {
      return 0;
    }
  }

  function getBPClass(sys: number, dia: number) {
    if (sys > 180 || dia > 120) return { label: "Crisis", color: "#ef4444", bg: "#fef2f2", text: "#991b1b" };
    if (sys >= 140 || dia >= 90) return { label: "Stage 2", color: "#f97316", bg: "#fff7ed", text: "#c2410c" };
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return { label: "Stage 1", color: "#eab308", bg: "#fef9c3", text: "#854d0e" };
    if (sys >= 120 && sys < 130 && dia < 80) return { label: "Elevated", color: "#06b6d4", bg: "#ecfeff", text: "#0891b2" };
    return { label: "Normal", color: "#10b981", bg: "#f0fdf4", text: "#166534" };
  }



  useEffect(() => {
    if (activeNav === "today") {
      const timer = setTimeout(() => {
        const activeEl = document.querySelector('[data-active-date="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeDay, activeNav]);

  /* ── derived ─────────────────────────────────────────────── */
  const todayRems = reminders.filter(r => r.date === activeDay).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  const takenCount = todayRems.filter(r => r.taken).length;
  const pct = todayRems.length ? Math.round((takenCount / todayRems.length) * 100) : 0;
  const missedRems = reminders.filter(r => !r.taken && r.date < TODAY);
  const familyRems = reminders.filter(r => !!r.forMember);
  const dayAppts = appointments.filter(a => a.date === activeDay);
  const notifCount = missedRems.length + familyRems.length;

  /* ═══════════════════════════════════════════════════════════
     HANDLERS
  ═══════════════════════════════════════════════════════════ */
  const toggleTaken = async (id: number) => {
    const rem = reminders.find(r => r.id === id);
    if (!rem) return;
    const newTaken = !rem.taken;
    setReminders(p => p.map(r => r.id === id ? { ...r, taken: newTaken, skipped: false, skipReason: undefined } : r));

    // Update stock count dynamically
    const match = rem.sub.match(/^([\d.]+)\s+/);
    const dosage = match ? parseFloat(match[1]) : 1;
    setPillStocks(prev => prev.map(stock => {
      if (stock.name.toLowerCase() === rem.label.toLowerCase()) {
        const newStock = newTaken ? Math.max(0, stock.stock - dosage) : (stock.stock + dosage);
        return { ...stock, stock: Math.round(newStock * 10) / 10 };
      }
      return stock;
    }));

    try {
      const { error } = await supabase.from("reminders").update({ taken: newTaken, skipped: false, skip_reason: null }).eq("id", id);
      if (error) {
        console.error("Error updating reminder status in Supabase:", error);
      }
    } catch (err) {
      console.error("Error updating reminder status in Supabase:", err);
    }
  };

  const skipReminder = async (id: number, reason: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, taken: false, skipped: true, skipReason: reason } : r));
    try {
      const { error } = await supabase.from("reminders").update({ taken: false, skipped: true, skip_reason: reason }).eq("id", id);
      if (error) {
        console.error("Error updating skip status in Supabase:", error);
      }
    } catch (err) {
      console.error("Error updating skip status in Supabase:", err);
    }
  };

  async function deleteReminder(id: number, deleteAllFuture: boolean = false) {
    const target = reminders.find(r => r.id === id);
    if (!target) return;

    if (deleteAllFuture) {
      const toDelete = reminders.filter(r =>
        r.label === target.label &&
        r.time === target.time &&
        (r.forMember || null) === (target.forMember || null) &&
        r.date >= target.date
      );
      const deleteIds = toDelete.map(r => r.id);

      setReminders(prev => prev.filter(r => !deleteIds.includes(r.id)));

      try {
        const { error } = await supabase.from("reminders").delete().in("id", deleteIds);
        if (error) {
          console.error("Error deleting series:", error);
        }
      } catch (err) {
        console.error("Error deleting series:", err);
      }
    } else {
      setReminders(prev => prev.filter(r => r.id !== id));
      try {
        const { error } = await supabase.from("reminders").delete().eq("id", id);
        if (error) {
          console.error("Error deleting reminder:", error);
        }
      } catch (err) {
        console.error("Error deleting reminder:", err);
      }
    }
  }

  async function addCaretaker() {
    if (!newCT.name.trim() || !newCT.phone.trim()) return;
    const item = { id: Date.now(), ...newCT };
    setCaretakers(p => [...p, item]);
    setNewCT({ name: "", phone: "" }); setShowAddCT(false);
    try {
      const { error } = await supabase.from("caretakers").insert([{ ...item, user_id: session?.user?.id }]);
      if (error) {
        console.error("Error adding caretaker to Supabase:", error);
        showToast("Supabase Error: " + error.message, "error");
      }
    } catch (err) {
      console.error("Error adding caretaker to Supabase:", err);
    }
  }
  async function deleteCaretaker(id: number) {
    setCaretakers(p => p.filter(x => x.id !== id));
    try {
      const { error } = await supabase.from("caretakers").delete().eq("id", id);
      if (error) {
        console.error("Error deleting caretaker from Supabase:", error);
        showToast("Supabase Error: " + error.message, "error");
      }
    } catch (err) {
      console.error("Error deleting caretaker from Supabase:", err);
    }
  }

  async function addMember() {
    if (!newMName.trim()) return;
    const item = { id: Date.now(), name: newMName.trim() };
    setMembers(p => [...p, item]);
    setNewMName(""); setShowAddMember(false);
    try {
      const { error } = await supabase.from("members").insert([{ ...item, user_id: session?.user?.id }]);
      if (error) {
        console.error("Error adding member to Supabase:", error);
        if (error.message.includes("user_id") && error.message.includes("schema cache")) {
          // Fallback: try inserting without user_id column
          const { error: fallbackErr } = await supabase.from("members").insert([item]);
          if (fallbackErr) {
            console.error("Fallback error adding member to Supabase:", fallbackErr);
          }
        } else {
          showToast("Supabase Error: " + error.message, "error");
        }
      }
    } catch (err) {
      console.error("Error adding member to Supabase:", err);
    }
  }
  async function deleteMember(id: number) {
    setMembers(p => p.filter(x => x.id !== id));
    try {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) {
        console.error("Error deleting member from Supabase:", error);
        showToast("Supabase Error: " + error.message, "error");
      }
    } catch (err) {
      console.error("Error deleting member from Supabase:", err);
    }
  }

  async function addAppointment() {
    if (!newAppt.doctor.trim() || !newAppt.date) return;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    if (newAppt.date < TODAY) {
      showToast("Appointment date cannot be in the past.", "error");
      return;
    }
    if (newAppt.date === TODAY && newAppt.time && newAppt.time <= currentTimeStr) {
      showToast("Appointment time cannot be in the past.", "error");
      return;
    }

    const item = { id: Date.now(), ...newAppt };
    setAppointments(p => [...p, item]);
    setNewAppt({ doctor: "", specialty: "", date: "", time: "", notes: "" }); setShowAddAppt(false);
    try {
      const { error } = await supabase.from("appointments").insert([{ ...item, user_id: session?.user?.id }]);
      if (error) {
        console.error("Error adding appointment to Supabase:", error);
        // Fallback without user_id column
        const { error: fallbackErr } = await supabase.from("appointments").insert([item]);
        if (fallbackErr) {
          console.error("Fallback error adding appointment to Supabase:", fallbackErr);
          showToast("Supabase Error: " + fallbackErr.message, "error");
        }
      }
    } catch (err) {
      console.error("Error adding appointment to Supabase:", err);
    }
  }

  async function deleteAppointment(id: number) {
    setAppointments(p => p.filter(x => x.id !== id));
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) {
        console.error("Error deleting appointment from Supabase:", error);
        showToast("Supabase Error: " + error.message, "error");
      }
    } catch (err) {
      console.error("Error deleting appointment from Supabase:", err);
    }
  }

  function openMemberWizard(memberName: string) {
    setActiveTimeSlot(0);
    setWizard({ kind: "memberReminder", step: 0, forMember: memberName, data: {} });
  }
  function openMainPillWizard() {
    setActiveTimeSlot(0);
    setWizard({ kind: "mainPill", step: 0, data: {} });
  }

  function wUpdate(patch: Record<string, any>) {
    setWizardError(false);
    setWizard(w => {
      if (!w) return null;
      let nextStep = w.step;
      if (patch.choice) {
        nextStep = 1;
      }
      return { ...w, step: nextStep, data: { ...w.data, ...patch } };
    });
  }
  function validateWizard(w: WizardState): string | null {
    const d = w.data;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    if (w.kind === "mainPill") {
      if (d.choice === "medicine") {
        if (w.step === 1) {
          if (!d.pillName || !d.pillName.trim()) return "Medicine Name is required.";
        }
        if (w.step === 2) {
          if (!d.pillType) return "Medicine Type is required.";
        }
        if (w.step === 3) {
          if (!d.pillCount || !d.pillCount.trim()) return "Dose quantity is required.";
          if (d.pillType === "Capsule") {
            const numVal = Number(d.pillCount);
            if (isNaN(numVal) || !Number.isInteger(numVal) || numVal <= 0) {
              return "Capsules cannot be split. Please enter a whole number (e.g. 1, 2).";
            }
          }
        }
        if (w.step === 4) {
          if (!d.frequency) return "Frequency is required.";
        }
        if (w.step === 5) {
          if (!d.startDate) return "Start date is required.";
          if (d.startDate < TODAY) return "Start date cannot be in the past.";
        }
        if (w.step === 6) {
          if (d.endDate) {
            if (d.endDate < TODAY) return "End date cannot be in the past.";
            if (d.startDate && d.endDate < d.startDate) return "End date cannot be before start date.";
          }
        }
        if (w.step === 7) {
          const freq = FREQ_OPTS.find(f => f.val === d.frequency || f.key === d.frequency) || FREQ_OPTS[0];
          const startDateVal = d.startDate || TODAY;
          for (let i = 0; i < freq.count; i++) {
            if (!d[`time_${i}`]) return `Time slot ${i + 1} is required.`;
          }
          if (startDateVal === TODAY) {
            for (let i = 0; i < freq.count; i++) {
              const tv = d[`time_${i}`] || "09:00";
              if (tv <= currentTimeStr) {
                return `Time slot ${i + 1} (${fmtTime(tv)}) cannot be in the past today.`;
              }
            }
          }
        }
      } else if (d.choice === "appointment") {
        if (w.step === 1) {
          if (!d.doctor || !d.doctor.trim()) return "Doctor name is required.";
        }
        if (w.step === 3) {
          if (!d.date) return "Appointment date is required.";
          if (d.date < TODAY) return "Appointment date cannot be in the past.";
          if (!d.time) return "Appointment time is required.";
          if (d.date === TODAY && d.time) {
            if (d.time <= currentTimeStr) {
              return `Appointment time (${fmtTime(d.time)}) cannot be in the past today.`;
            }
          }
        }
      } else if (d.choice === "other") {
        if (w.step === 1) {
          if (!d.description || !d.description.trim()) return "Description is required.";
        }
        if (w.step === 2) {
          if (!d.startDate) return "Start date is required.";
          if (d.startDate < TODAY) return "Start date cannot be in the past.";
          if (d.endDate) {
            if (d.endDate < TODAY) return "End date cannot be in the past.";
            if (d.startDate && d.endDate < d.startDate) return "End date cannot be before start date.";
          }
        }
        if (w.step === 3) {
          if (!d.reminderTime) return "Reminder time is required.";
          const startDateVal = d.startDate || TODAY;
          if (startDateVal === TODAY && d.reminderTime) {
            if (d.reminderTime <= currentTimeStr) {
              return `Reminder time (${fmtTime(d.reminderTime)}) cannot be in the past today.`;
            }
          }
        }
      }
    } else if (w.kind === "memberReminder") {
      const t = d.reminderType;
      if (t === "pill") {
        if (w.step === 1) {
          if (!d.pillName || !d.pillName.trim()) return "Medicine Name is required.";
        }
        if (w.step === 2) {
          if (!d.pillType) return "Medicine Type is required.";
        }
        if (w.step === 3) {
          if (!d.pillCount || !d.pillCount.trim()) return "Dose quantity is required.";
          if (d.pillType === "Capsule") {
            const numVal = Number(d.pillCount);
            if (isNaN(numVal) || !Number.isInteger(numVal) || numVal <= 0) {
              return "Capsules cannot be split. Please enter a whole number (e.g. 1, 2).";
            }
          }
        }
        if (w.step === 4) {
          if (!d.frequency) return "Frequency is required.";
        }
        if (w.step === 6) {
          if (!d.startDate) return "Start date is required.";
          if (d.startDate < TODAY) return "Start date cannot be in the past.";
        }
        if (w.step === 7) {
          if (d.endDate) {
            if (d.endDate < TODAY) return "End date cannot be in the past.";
            if (d.startDate && d.endDate < d.startDate) return "End date cannot be before start date.";
          }
        }
        if (w.step === 8) {
          const freq = FREQ_OPTS.find(f => f.val === d.frequency || f.key === d.frequency) || FREQ_OPTS[0];
          const startDateVal = d.startDate || TODAY;
          for (let i = 0; i < freq.count; i++) {
            if (!d[`time_${i}`]) return `Time slot ${i + 1} is required.`;
          }
          if (startDateVal === TODAY) {
            for (let i = 0; i < freq.count; i++) {
              const tv = d[`time_${i}`] || "09:00";
              if (tv <= currentTimeStr) {
                return `Time slot ${i + 1} (${fmtTime(tv)}) cannot be in the past today.`;
              }
            }
          }
        }
      } else if (t === "others") {
        if (w.step === 1) {
          if (!d.description || !d.description.trim()) return "Description is required.";
        }
        if (w.step === 2) {
          if (!d.reminderDate) return "Date is required.";
          if (d.reminderDate < TODAY) return "Date cannot be in the past.";
          if (!d.reminderTime) return "Time is required.";
          if (d.reminderDate === TODAY && d.reminderTime) {
            if (d.reminderTime <= currentTimeStr) {
              return `Reminder time (${fmtTime(d.reminderTime)}) cannot be in the past today.`;
            }
          }
        }
      } else {
        if (w.step === 2) {
          if (!d.reminderDate) return "Date is required.";
          if (d.reminderDate < TODAY) return "Date cannot be in the past.";
          if (d.endDate) {
            if (d.endDate < TODAY) return "End date cannot be in the past.";
            if (d.reminderDate && d.endDate < d.reminderDate) return "End date cannot be before start date.";
          }
          if (!d.reminderTime) return "Time is required.";
          if (d.reminderDate === TODAY && d.reminderTime) {
            if (d.reminderTime <= currentTimeStr) {
              return `Reminder time (${fmtTime(d.reminderTime)}) cannot be in the past today.`;
            }
          }
        }
      }
    }
    return null;
  }

  function wNext() {
    if (!wizard) return;
    const err = validateWizard(wizard);
    if (err) {
      if (err.toLowerCase().includes("required") || err.toLowerCase().includes("choose") || err.toLowerCase().includes("select")) {
        setWizardError(true);
        setShakeWizard(true);
        setTimeout(() => setShakeWizard(false), 500);
        return;
      }
      showToast(err, "error");
      return;
    }
    setWizardError(false);
    setActiveTimeSlot(0);

    const isMedPill = (wizard.kind === "mainPill" && wizard.data.choice === "medicine") ||
      (wizard.kind === "memberReminder" && wizard.data.reminderType === "pill");
    const isStocked = isMedPill && isPillAlreadyStocked(wizard.data.pillName, pillStocks);

    if (isLastStep(wizard, pillStocks)) { submitWizard(); return; }

    if (isStocked && wizard.step === 1) {
      setWizard(w => w ? { ...w, step: 3 } : null);
    } else {
      setWizard(w => w ? { ...w, step: w.step + 1 } : null);
    }
  }
  function wBack() {
    if (!wizard) return;
    setWizardError(false);
    if (wizard.step === 0) { setWizard(null); return; }

    const isMedPill = (wizard.kind === "mainPill" && wizard.data.choice === "medicine") ||
      (wizard.kind === "memberReminder" && wizard.data.reminderType === "pill");
    const isStocked = isMedPill && isPillAlreadyStocked(wizard.data.pillName, pillStocks);

    let targetStep = wizard.step - 1;
    if (isStocked && wizard.step === 3) {
      targetStep = 1;
    }

    setWizard(w => {
      if (!w) return null;
      const nextData = { ...w.data };
      if (targetStep === 0) {
        delete nextData.choice;
        delete nextData.reminderType;
      }
      setActiveTimeSlot(0);
      return { ...w, step: targetStep, data: nextData };
    });
  }
  function wSkip() {
    setWizardError(false);
    setActiveTimeSlot(0);
    if (!wizard) return;
    const isMedPill = (wizard.kind === "mainPill" && wizard.data.choice === "medicine") ||
      (wizard.kind === "memberReminder" && wizard.data.reminderType === "pill");
    const isStocked = isMedPill && isPillAlreadyStocked(wizard.data.pillName, pillStocks);

    if (isStocked && wizard.step === 1) {
      setWizard(w => w ? { ...w, step: 3 } : null);
    } else {
      setWizard(w => w ? { ...w, step: w.step + 1 } : null);
    }
  }

  async function submitWizard() {
    if (!wizard) return;
    const d = wizard.data;
    if (wizard.kind === "mainPill" && d.choice === "appointment") {
      const item = {
        id: Date.now(),
        doctor: d.doctor || "",
        specialty: d.specialty || "",
        date: d.date || TODAY,
        time: d.time || "10:00",
        notes: d.notes || ""
      };
      setAppointments(p => [...p, item]);
      setWizard(null);
      try {
        const { error } = await supabase.from("appointments").insert([{ ...item, user_id: session?.user?.id }]);
        if (error) {
          console.error("Error adding appointment to Supabase with user_id:", error);
          const { error: fallbackErr } = await supabase.from("appointments").insert([item]);
          if (fallbackErr) {
            console.error("Fallback error adding appointment to Supabase:", fallbackErr);
            showToast("Supabase Error: " + fallbackErr.message, "error");
          } else {
            showToast("Appointment scheduled successfully!", "success");
          }
        } else {
          showToast("Appointment scheduled successfully!", "success");
        }
      } catch (err) {
        console.error("Error adding appointment to Supabase:", err);
      }
      return;
    }
    const isPill = wizard.kind === "mainPill" ? (d.choice === "medicine") : (d.reminderType === "pill");
    if (isPill && d.pillName && d.pillName.trim()) {
      const trimmed = d.pillName.trim();
      setCustomPillNames(prev => {
        if (!prev.includes(trimmed)) {
          const next = [...prev, trimmed];
          localStorage.setItem("custom_pills_shared", JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
    const color = COLORS[reminders.length % COLORS.length];
    const newR: Reminder[] = [];
    const startDate = d.startDate || TODAY;

    function getDatesRange(startStr: string, endStr: string) {
      const dates = [];
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return [startStr];
      }
      const current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const r = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${r}`);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }

    if (wizard.kind === "mainPill" && d.choice === "other") {
      let endStr = d.endDate;
      if (!endStr) {
        endStr = startDate;
      }
      const dates = getDatesRange(startDate, endStr);
      dates.forEach((dateVal, dateIdx) => {
        newR.push({
          id: Date.now() + dateIdx,
          label: d.description || "Other Reminder",
          sub: d.endDate ? `From ${startDate} to ${d.endDate}` : `One-time reminder`,
          time: fmtTime(d.reminderTime || "09:00"),
          color, taken: false,
          emoji: "⭐",
          forMember: wizard.forMember,
          date: dateVal,
          alarmMode: d.alarmMode === true || d.alarmMode === "true",
        });
      });
    } else if (isPill) {
      const freq = FREQ_OPTS.find(f => f.val === d.frequency || f.key === d.frequency) || FREQ_OPTS[0];
      let endStr = d.endDate;
      if (!endStr) {
        endStr = startDate;
      }
      const dates = getDatesRange(startDate, endStr);

      dates.forEach((dateVal, dateIdx) => {
        for (let i = 0; i < freq.count; i++) {
          const tv = d[`time_${i}`] || "09:00";
          let countText = d.pillCount || "1";
          let doseUnit = (d.pillType || "tablet").toLowerCase();
          if (d.pillType === "Syrup") {
            if (!countText.toLowerCase().includes("ml")) {
              countText += " ml";
            }
            doseUnit = "";
          } else if (d.pillType === "Drops") {
            if (parseFloat(countText) > 1) {
              doseUnit = "drops";
            } else {
              doseUnit = "drop";
            }
          } else if (d.pillType === "Powder") {
            const ctL = countText.toLowerCase();
            const hasUnit = ctL.includes("g") || ctL.includes("mg") || ctL.includes("sachet") || ctL.includes("packet") || ctL.includes("spoon");
            if (hasUnit) {
              doseUnit = "";
            } else {
              doseUnit = parseFloat(countText) > 1 ? "sachets" : "sachet";
            }
          } else if (d.pillType === "Inhaler") {
            doseUnit = parseFloat(countText) > 1 ? "puffs" : "puff";
          } else if (["tablet", "capsule"].includes(doseUnit)) {
            if (parseFloat(countText) > 1) {
              doseUnit += "s";
            }
          } else if (d.pillType === "Injection") {
            if (parseFloat(countText) > 1) {
              doseUnit += "s";
            }
          }
          newR.push({
            id: Date.now() + dateIdx * 100 + i,
            label: d.pillName || "Medication",
            sub: `${countText} ${doseUnit} · From ${startDate} to ${d.endDate || "Ongoing"}`,
            time: fmtTime(tv),
            color: COLORS[(reminders.length + dateIdx * 100 + i) % COLORS.length],
            taken: false,
            emoji: d.pillType || "pill",
            forMember: wizard.forMember,
            date: dateVal,
            alarmMode: d.alarmMode === true || d.alarmMode === "true",
          });
        }
      });
    } else {
      const rt = REM_TYPES.find(r => r.key === d.reminderType);
      const startDate = d.reminderDate || TODAY;
      let endStr = d.endDate;
      if (!endStr) {
        endStr = startDate;
      }
      const dates = getDatesRange(startDate, endStr);
      dates.forEach((dateVal, dateIdx) => {
        newR.push({
          id: Date.now() + dateIdx,
          label: rt?.label || "Reminder",
          sub: d.endDate
            ? `From ${startDate} to ${d.endDate}${d.notes ? " · " + d.notes : ""}`
            : (d.notes || "Scheduled reminder"),
          time: fmtTime(d.reminderTime || ""),
          color, taken: false,
          emoji: rt?.emoji || "⭐",
          forMember: wizard.forMember,
          date: dateVal,
          alarmMode: d.alarmMode === true || d.alarmMode === "true",
        });
      });
    }

    console.log("Generating new reminders inside submitWizard:", newR);
    setReminders(p => [...p, ...newR]);

    if (isPill && d.pillName) {
      const name = d.pillName.trim();
      const stockVal = parseInt(d.inventory || "0") || 0;
      const minStockVal = parseInt(d.minStock || "0") || 0;
      const mType = d.pillType || "Tablet";

      setPillStocks(prev => {
        const exists = prev.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (exists) {
          return prev.map(p => p.name.toLowerCase() === name.toLowerCase() ? { ...p, stock: stockVal || p.stock, minStock: minStockVal || p.minStock, type: mType || p.type } : p);
        }
        return [...prev, { name, stock: stockVal, minStock: minStockVal, type: mType }];
      });
    }

    setWizard(null);

    try {
      const dbReminders = newR.map(r => ({
        id: r.id,
        label: r.label,
        sub: r.sub,
        time: r.time,
        color: r.color,
        taken: r.taken,
        emoji: r.emoji,
        for_member: r.forMember || null,
        date: r.date,
        user_id: session?.user?.id
      }));
      const { error } = await supabase.from("reminders").insert(dbReminders);
      if (error) {
        console.error("Error inserting reminders into Supabase:", error);
      }
    } catch (err) {
      console.error("Error inserting reminders into Supabase:", err);
    }
  }

  async function handleOnboardingComplete(data: { name: string, age: number, gender: string, goals: string[] }) {
    setProfile(p => ({ ...p, name: data.name }));
    setOnboarded(true);
    try {
      await supabase.from("profile").update({ name: data.name }).eq("id", session?.user?.id);
    } catch (e) {
      console.error("Error saving onboarding name to profile:", e);
    }
  }

  async function saveProfile() {
    setProfile(p => ({ ...p, name: editP.name, age: editP.age, gender: editP.gender }));
    setShowEditProfile(false);
    try {
      const { error } = await supabase.from("profile").update({
        name: editP.name
      }).eq("id", session?.user?.id);
      if (error) {
        console.error("Error saving profile to Supabase:", error);
        showToast("Supabase Error: " + error.message, "error");
      }
    } catch (err) {
      console.error("Error saving profile to Supabase:", err);
    }
  }

  function sendAI() {
    if (!aiInput.trim()) return;
    const q = aiInput.trim();
    const low = q.toLowerCase();
    let reply = "";

    if (low.includes("hello") || low.includes("hi") || low.includes("hey")) {
      reply = "Hello! 👋 I'm here to help you manage your health and medications. How can I assist you today?";
    } else if (low.includes("paracetamol") || low.includes("dolo") || low.includes("fever") || low.includes("headache")) {
      reply = "Paracetamol (such as Dolo 550) is commonly used to treat mild-to-moderate pain and fever. Adults should not take more than 4000 mg (4 grams) per day. Always take it with food or water to avoid stomach upset. Please seek medical help if pain or fever persists.";
    } else if (low.includes("cetirizin") || low.includes("allergy") || low.includes("cold") || low.includes("sneeze")) {
      reply = "Cetirizine is an antihistamine used to relieve allergy symptoms like watery eyes, runny nose, sneezing, or hives. It can make you feel slightly drowsy, so it is recommended to take it in the evening or before bed.";
    } else if (low.includes("vitamin") || low.includes("d3")) {
      reply = "Vitamin D3 helps your body absorb calcium for healthy bones and teeth. It is fat-soluble, meaning it's best absorbed when taken with a meal containing healthy fats. Always stick to your doctor's prescribed dosage frequency.";
    } else if (low.includes("simvastatin") || low.includes("cholesterol") || low.includes("lipid")) {
      reply = "Simvastatin is used to lower cholesterol and triglycerides in the blood. It is best taken in the evening, as cholesterol synthesis by the liver peaks during the night. Avoid drinking grapefruit juice while taking it.";
    } else if (low.includes("side effect")) {
      reply = "Common side effects for medications range from mild drowsiness and dry mouth to stomach upset. If you experience severe symptoms like breathing difficulty, hives, or swelling, contact emergency services immediately.";
    } else if (low.includes("water") || low.includes("hydrate")) {
      reply = "Staying hydrated is crucial! Try to drink at least 2.5 liters of water daily. Proper hydration supports kidney function, flushes out metabolic waste, and helps your body process medications efficiently.";
    } else if (low.includes("sleep")) {
      reply = "Quality sleep (7-8 hours) is vital for cellular repair and cardiovascular health. Keeping consistent bedtimes and wake times helps stabilize your circadian rhythm and blood pressure.";
    } else {
      reply = `Great question! Regarding "${q.slice(0, 50)}" — always follow your healthcare provider's instructions carefully. Skipping doses or changing scheduled timings can reduce treatment effectiveness. Is there a specific medication schedule you would like me to explain?`;
    }

    setAiMsgs(p => [...p,
    { role: "user", text: q },
    { role: "ai", text: reply },
    ]);
    setAiInput("");
  }

  /* ═══════════════════════════════════════════════════════════
     SHARED UI PIECES
  ═══════════════════════════════════════════════════════════ */

  /* ═══════════════════════════════════════════════════════════
     MAIN HEADER (home views)
  ═══════════════════════════════════════════════════════════ */
  function MainHeader() {
    return (
      <div className="relative px-5 pt-3.5 pb-4 flex-shrink-0"
        style={{ background: "linear-gradient(135deg,#14B8A6 0%,#0ea5a0 55%,#0891b2 100%)" }}>
        <div className="absolute top-0 right-0 w-44 h-44 rounded-full opacity-10 bg-white" style={{ transform: "translate(35%,-35%)" }} />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-10 bg-white" style={{ transform: "translate(-30%,30%)" }} />

        {/* topbar */}
        <div className="relative flex items-center justify-between mb-3">
          <NunuLogo className="h-18 w-auto -ml-2.5" variant="white" />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotif(true)}
              className="relative w-9 h-9 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Bell className="w-[18px] h-[18px] text-white" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-white flex items-center justify-center text-white font-extrabold" style={{ fontSize: "9px" }}>
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>
            <button onClick={() => setView("profile")}
              className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-2xl pl-1.5 pr-3 py-1 active:scale-95 transition-all">
              <div className="w-7 h-7 rounded-xl bg-white/30 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">{profile.name}</span>
            </button>
          </div>
        </div>

        {/* hero content */}
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm font-semibold">
              {(() => {
                try {
                  const parts = activeDay.split("-");
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                } catch (e) {
                  return activeDay;
                }
              })()}
            </p>
            <h2 className="text-white text-[22px] font-extrabold mt-0.5 leading-snug">
              {activeNav === "today" ? t("goodMorning")
                : activeNav === "progress" ? t("myProgress")
                  : activeNav === "health" ? t("healthOverview")
                    : t("settings") + " ⚙️"}
            </h2>
            {activeNav === "today" && (
              <>
                <p className="text-white/80 text-sm mt-1">
                  {takenCount === todayRems.length && todayRems.length > 0
                    ? t("allDone")
                    : `${todayRems.length - takenCount} ${t("remainingReminders")}`}
                </p>
                <div className="flex gap-1.5 mt-2">
                  {todayRems.map(r => (
                    <div key={r.id} className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{ background: r.taken ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.25)" }} />
                  ))}
                </div>
              </>
            )}
          </div>
          {activeNav === "today" && (
            <div className="relative flex items-center justify-center">
              <RingProgress pct={pct} />
              <div className="absolute flex flex-col items-center">
                <span className="text-white font-extrabold text-lg leading-none">{pct}%</span>
                <span className="text-white/70 text-[10px] font-semibold">{t("done")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     BOTTOM NAV
  ═══════════════════════════════════════════════════════════ */
  function BottomNav() {
    const items = [
      { icon: Home, label: t("today"), key: "today" as ActiveNav },
      { icon: TrendingUp, label: t("progress"), key: "progress" as ActiveNav },
      { icon: Heart, label: t("health"), key: "health" as ActiveNav },
      { icon: Settings, label: t("settings"), key: "settings" as ActiveNav },
    ];
    return (
      <div className="flex items-center justify-around px-2 py-3 flex-shrink-0"
        style={{
          background: "rgba(255,255,255,.95)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(0,0,0,.06)", boxShadow: "0 -8px 32px rgba(0,0,0,.06)"
        }}>
        {items.map(({ icon: Icon, label, key }) => {
          const a = activeNav === key;
          return (
            <button key={key} onClick={() => setActiveNav(key)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-2xl relative transition-all duration-200">
              {a && <div className="absolute inset-0 rounded-2xl" style={{ background: "rgba(20,184,166,0.08)" }} />}
              <div className="relative w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
                style={{ background: a ? "linear-gradient(135deg,#14B8A6,#0ea5a0)" : "transparent" }}>
                <Icon className="w-[18px] h-[18px]" style={{ color: a ? "#fff" : "#94a3b8" }} />
              </div>
              <span className="text-[10px] font-extrabold" style={{ color: a ? "#14B8A6" : "#94a3b8" }}>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     TODAY VIEW
  ═══════════════════════════════════════════════════════════ */
  function TodayView() {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* week strip */}
        <div className="px-4 pt-3 pb-2 bg-white shadow-sm flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="flex gap-2">
            {WEEK.map(d => {
              const a = d.date === activeDay;
              return (
                <button 
                  key={d.date} 
                  ref={a ? calendarActiveRef : null}
                  onClick={() => setActiveDay(d.date)} 
                  data-active-date={a ? "true" : "false"}
                  className="flex-shrink-0 w-12 flex flex-col items-center py-2 rounded-2xl transition-all duration-200"
                  style={{ background: a ? "linear-gradient(135deg,#14B8A6,#0ea5a0)" : "transparent" }}
                >
                  <span className="text-[10px] font-bold" style={{ color: a ? "rgba(255,255,255,.8)" : "#94a3b8" }}>{d.label}</span>
                  <span className="text-sm font-extrabold mt-0.5" style={{ color: a ? "#fff" : "#334155" }}>{d.dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* schedule */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800">{t("todaysSchedule")}</h3>
            <button className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#14B8A6" }}>
              {t("viewAll")} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayRems.length === 0 && dayAppts.length === 0 && (
            <div className="flex flex-col items-center py-10 text-slate-400">
              <p className="text-sm font-semibold">{t("noReminders")}</p>
              <p className="text-xs mt-1">{t("tapPlusToAdd")}</p>
            </div>
          )}

          {todayRems.map(rem => (
            <div key={rem.id}
              className="relative flex items-center gap-3 p-4 rounded-3xl bg-white transition-all duration-200 overflow-hidden"
              style={{
                boxShadow: rem.taken ? "0 2px 8px rgba(0,0,0,.04)" : "0 4px 20px rgba(0,0,0,.08)",
                border: `1.5px solid ${rem.color}22`
              }}>
              <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: rem.taken ? "#e2e8f0" : rem.color }} />
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#EFF6FF", opacity: rem.taken ? .5 : 1 }}>
                <CustomIcon name={rem.emoji || "pill"} className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                {rem.forMember && <p className="text-[10px] font-extrabold text-indigo-500 mb-0.5">For: {rem.forMember}</p>}
                <p className="text-sm font-extrabold truncate"
                  style={{ color: rem.taken ? "#94a3b8" : "#1e293b", textDecoration: rem.taken ? "line-through" : "none" }}>
                  {rem.label}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400 font-semibold">{rem.time}</span>
                  <span className="text-slate-200 mx-0.5">·</span>
                  <span className="text-xs font-bold truncate" style={{ color: rem.taken ? "#94a3b8" : rem.color }}>{rem.sub}</span>
                </div>
                {rem.skipped && (
                  <div className="mt-1">
                    <span className="text-[9px] font-extrabold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md inline-block border border-rose-100 dark:border-rose-900/35">
                      🚫 Skipped: {rem.skipReason}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => rem.date >= TODAY && toggleTaken(rem.id)}
                  disabled={rem.date < TODAY}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-extrabold transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    minWidth: 62,
                    background: rem.taken
                      ? "#f0fdf9"
                      : rem.date < TODAY
                        ? "#f1f5f9"
                        : "linear-gradient(135deg,#14B8A6,#0ea5a0)",
                    color: rem.taken
                      ? "#14B8A6"
                      : rem.date < TODAY
                        ? "#94a3b8"
                        : "#fff",
                    border: rem.taken
                      ? "1.5px solid #99f6e4"
                      : rem.date < TODAY
                        ? "1.5px solid #cbd5e1"
                        : "none",
                    boxShadow: rem.taken || rem.date < TODAY ? "none" : "0 4px 12px rgba(20,184,166,0.35)"
                  }}>
                  {rem.taken ? (
                    <><Check className="w-3.5 h-3.5" />{t("undo") || "Undo"}</>
                  ) : (
                    rem.emoji === "💊" ? t("take") : (t("done") || "Done")
                  )}
                </button>
                {rem.date >= TODAY && (
                  <button onClick={() => {
                    setRescheduleRem(rem);
                    setReschedDate(rem.date);
                    const rawTime = rem.time;
                    let hh = 12;
                    let mm = 0;
                    const match = rawTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                      let hour = parseInt(match[1]);
                      const min = parseInt(match[2]);
                      const ampm = match[3].toUpperCase();
                      if (ampm === "PM" && hour < 12) hour += 12;
                      if (ampm === "AM" && hour === 12) hour = 0;
                      hh = hour;
                      mm = min;
                    }
                    setReschedTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);

                    // Parse end date from sub
                    const dateMatch = rem.sub.match(/From\s+([\d-]+)\s+to\s+([\d-]+|Ongoing)/);
                    if (dateMatch) {
                      const endD = dateMatch[2];
                      if (endD === "Ongoing") {
                        setIsOngoing(true);
                        setReschedEndDate("");
                      } else {
                        setIsOngoing(false);
                        setReschedEndDate(endD);
                      }
                    } else {
                      setIsOngoing(false);
                      setReschedEndDate("");
                    }
                  }}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all text-slate-500 hover:text-slate-700 active:scale-90"
                    title="Reschedule">
                    <CalendarClock className="w-4 h-4" />
                  </button>
                )}
                {rem.date >= TODAY && (
                  <button onClick={() => setDeletingRem(rem)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all text-red-500 hover:text-red-700 active:scale-90"
                    title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {dayAppts.map(appt => (
            <div key={appt.id}
              className="relative flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-50 shadow-sm overflow-hidden"
              style={{ borderLeft: "4px solid #0ea5e9" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#0ea5e915" }}>
                <Stethoscope className="w-6 h-6 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-extrabold text-sky-500 mb-0.5">Doctor Appointment</p>
                <p className="text-sm font-extrabold text-slate-800 truncate">{appt.doctor}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400 font-semibold">{fmtTime(appt.time)}</span>
                  <span className="text-slate-200 mx-0.5">·</span>
                  <span className="text-xs text-slate-400 font-bold truncate">{appt.specialty}</span>
                </div>
                {appt.notes && <p className="text-[11px] text-slate-400 mt-1 italic">{appt.notes}</p>}
              </div>
              {appt.date >= TODAY && (
                <button onClick={() => {
                  setRescheduleAppt(appt);
                  setReschedDate(appt.date);
                  setReschedTime(appt.time);
                }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all text-slate-500 hover:text-slate-700 active:scale-90"
                  title="Reschedule">
                  <CalendarClock className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => deleteAppointment(appt.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all text-red-500 hover:text-red-700 active:scale-90"
                title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="h-24" />
        </div>

      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PROGRESS VIEW
  ═══════════════════════════════════════════════════════════ */
  function ProgressView() {
    const firstDow = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cells = Array.from({ length: Math.ceil((firstDow + daysInMonth) / 7) * 7 }, (_, i) => {
      const d = i - firstDow + 1; return d >= 1 && d <= daysInMonth ? d : null;
    });
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const remByDay: Record<number, Reminder[]> = {};
    reminders.filter(r => r.date.startsWith(monthPrefix)).forEach(r => {
      const d = parseInt(r.date.split("-")[2]);
      if (!remByDay[d]) remByDay[d] = [];
      remByDay[d].push(r);
    });

    const apptByDay: Record<number, any[]> = {};
    appointments.filter(a => a.date.startsWith(monthPrefix)).forEach(a => {
      const d = parseInt(a.date.split("-")[2]);
      if (!apptByDay[d]) apptByDay[d] = [];
      apptByDay[d].push(a);
    });

    const selRems = calDay
      ? (remByDay[calDay] || []).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
      : [];
    const selAppts = calDay
      ? (apptByDay[calDay] || []).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
      : [];

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthLabel = `${monthNames[currentMonth - 1]} ${currentYear}`;
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-extrabold text-slate-800">{monthLabel}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="text-center text-[10px] font-extrabold text-slate-400 py-1">{l}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dr = (remByDay[day] || []).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
            const da = (apptByDay[day] || []).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
            const cellDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isTd = cellDateStr === TODAY;
            const isSel = day === calDay;
            return (
              <button key={i} onClick={() => setCalDay(calDay === day ? null : day)}
                className="rounded-xl p-1 text-left transition-all duration-200"
                style={{
                  background: isSel ? "#EFF6FF" : isTd ? "#f0fdfa" : "#fff",
                  border: isSel ? "2px solid #14B8A6" : isTd ? "2px solid #14B8A6" : "1.5px solid #f1f5f9",
                  minHeight: "58px"
                }}>
                <span className="block text-[10px] font-extrabold mb-0.5" style={{ color: isTd ? "#14B8A6" : "#475569" }}>{day}</span>
                <div className="space-y-0.5">
                  {dr.slice(0, 1).map(r => (
                    <div key={r.id} className="w-full text-[7px] font-extrabold px-1 py-0.5 rounded leading-tight truncate"
                      style={{ background: r.taken ? "#ccfbf1" : "#fee2e2", color: r.taken ? "#134e4a" : "#991b1b" }}>
                      {r.label.slice(0, 8)} {r.time.slice(0, 5)}
                    </div>
                  ))}
                  {da.slice(0, 1).map(a => (
                    <div key={a.id} className="w-full text-[7px] font-extrabold px-1 py-0.5 rounded leading-tight truncate bg-sky-100 text-sky-850">
                      🩺 {a.doctor.slice(0, 6)}
                    </div>
                  ))}
                  {dr.length + da.length > 2 && <div className="text-[7px] text-slate-400 font-bold">+{dr.length + da.length - 2} more</div>}
                </div>
                {dr.length === 0 && da.length === 0 && <div className="w-1.5 h-1.5 rounded-full bg-slate-100 mx-auto mt-1.5" />}
              </button>
            );
          })}
        </div>
        {calDay && (
          <div className="mt-4 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm font-extrabold text-slate-800 mb-3">{monthNames[currentMonth - 1]} {calDay} · Details</p>
            {selRems.length === 0 && selAppts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">{t("noReminders")}</p>
            ) : (
              <div className="space-y-2">
                {selRems.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: r.taken ? "#f0fdf4" : "#fef2f2", border: `1px solid ${r.taken ? "#bbf7d0" : "#fecaca"}` }}>
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                      <CustomIcon name={r.emoji || "pill"} className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold" style={{ color: r.taken ? "#166534" : "#991b1b" }}>{r.label}</p>
                      <p className="text-[10px] text-slate-400">{r.time} · {r.sub}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.date >= TODAY && (
                        <button onClick={() => setDeletingRem(r)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all text-red-500 hover:text-red-700 active:scale-90"
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.taken
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#22C55E" }} />
                        : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    </div>
                  </div>
                ))}
                {selAppts.map(appt => (
                  <div key={appt.id} className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50 border border-sky-200">
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 bg-sky-100 rounded-xl">
                      <Stethoscope className="w-4.5 h-4.5 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-sky-950">Dr. {appt.doctor}</p>
                      <p className="text-[10px] text-slate-500">{appt.time} · {appt.specialty}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => deleteAppointment(appt.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all text-red-500 hover:text-red-700 active:scale-90"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="h-8" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     HEALTH VIEW
  ═══════════════════════════════════════════════════════════ */
  function HealthView() {
    const historyRems = reminders.filter(r => r.date <= TODAY);
    const totalPills = historyRems.length;
    const takenPills = historyRems.filter(r => r.taken).length;

    const adherencePct = totalPills > 0 ? Math.round((takenPills / totalPills) * 100) : 0;
    const missedPct = totalPills > 0 ? Math.round(((totalPills - takenPills) / totalPills) * 100) : 0;

    let streak = 0;
    let checkDate = new Date(TODAY);
    const earliestReminder = reminders.reduce((earliest, current) => current.date < earliest ? current.date : earliest, TODAY);

    while (true) {
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const r = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${r}`;

      const dayRems = reminders.filter(rem => rem.date === dateStr);
      if (dayRems.length > 0) {
        const allTaken = dayRems.every(rem => rem.taken);
        if (allTaken) {
          streak++;
        } else {
          if (dateStr === TODAY) {
            // If today is not fully completed yet, don't break the streak immediately; check yesterday
          } else {
            break;
          }
        }
      } else {
        if (dateStr < earliestReminder) {
          break;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const totalPillsStock = pillStocks.reduce((sum, p) => sum + p.stock, 0);

    const bpClass = getBPClass(bpSystolic, bpDiastolic);

    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
        {/* Adherence & Missed Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-50 flex flex-col items-center justify-center">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-lg font-black text-emerald-500">{adherencePct}%</p>
            <p className="text-xs text-slate-400 font-bold">{t("adherence")}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-50 flex flex-col items-center justify-center">
            <div className="text-2xl mb-1">❌</div>
            <p className="text-lg font-black text-rose-500">{missedPct}%</p>
            <p className="text-xs text-slate-400 font-bold">{t("missed")}</p>
          </div>
        </div>

        {/* Medicine Box Card */}
        <button 
          onClick={() => setView("pillbox")}
          className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-50 hover:bg-slate-50 active:scale-[0.98] transition-all outline-none text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl text-teal-600">
              📦
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Medicine Box</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Manage stock & refill alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-50 text-teal-600 text-xs font-black rounded-full">
              {pillStocks.length} Items
            </span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        </button>

        {/* 2. Sleep Cycle */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-50 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">{t("sleepCycle")}</h3>
              <p className="text-[10px] text-slate-400 font-bold">{t("tonightsQuality")}: <span className="text-emerald-500 font-bold">{sleepQuality}%</span></p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Moon className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-800">{sleepHours} <span className="text-xs font-bold text-slate-400">hrs</span></p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("duration")}</p>
            </div>
            <div className="flex flex-col justify-end text-right">
              <div className="flex gap-1.5 justify-end items-center text-[10px]">
                <span className="text-slate-600">💤 {bedtime}</span>
                <span className="text-slate-600">☀️ {waketime}</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("bedtimeWake")}</p>
            </div>
          </div>

          {/* Sleep breakdown */}
          <div className="relative z-10 space-y-1 mb-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 flex overflow-hidden">
              <div className="h-full bg-teal-700" style={{ width: '30%' }} title="Deep Sleep (30%)" />
              <div className="h-full bg-teal-500" style={{ width: '50%' }} title="Light Sleep (50%)" />
              <div className="h-full bg-cyan-300" style={{ width: '15%' }} title="REM (15%)" />
              <div className="h-full bg-slate-300" style={{ width: '5%' }} title="Awake (5%)" />
            </div>
            <div className="flex gap-2 text-[8px] font-bold text-slate-400 justify-between">
              <div className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-teal-700" /> Deep 30%</div>
              <div className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-teal-500" /> Light 50%</div>
              <div className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-cyan-300" /> REM 15%</div>
              <div className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-slate-300" /> Awake 5%</div>
            </div>
          </div>

          <button
            onClick={() => setShowLogSleep(true)}
            className="relative z-10 w-full py-2 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 transition-all flex items-center justify-center gap-1"
          >
            🌙 {t("logSleepData")}
          </button>
        </div>

        {/* 3. Blood Pressure */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-50">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">{t("bloodPressure")}</h3>
              <p className="text-[10px] text-slate-400 font-bold">{t("lastRecorded")}: Today</p>
            </div>
            <div
              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1"
              style={{ backgroundColor: bpClass.bg, color: bpClass.text }}
            >
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: bpClass.color }} />
              {bpClass.label}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {bpSystolic}<span className="text-slate-300 font-normal">/</span>{bpDiastolic}
                </span>
                <span className="text-[10px] font-bold text-slate-400">mmHg</span>
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">
                {t("systolicDiastolic")}
              </p>
            </div>

            <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center border-2 text-[10px] font-black"
              style={{
                borderColor: bpClass.color,
                backgroundColor: `${bpClass.color}15`,
                color: bpClass.text
              }}
            >
              BP
            </div>
          </div>

          <button
            onClick={() => {
              setTempSystolic(bpSystolic);
              setTempDiastolic(bpDiastolic);
              setShowLogBP(true);
            }}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 transition-all flex items-center justify-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" /> {t("logNewReading")}
          </button>
        </div>

        {/* Heart Rate block removed */}

        {/* Tip */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-50">
          <p className="text-xs font-extrabold text-slate-800 mb-1.5">💡 {t("healthTip")}</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">{t("healthTipDesc")}</p>
        </div>
        <div className="h-8" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SETTINGS VIEW
  ═══════════════════════════════════════════════════════════ */
  function SettingsView() {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>
        {/* profile card */}
        <button className="w-full flex items-center gap-3 p-4 rounded-3xl bg-white shadow-sm border border-slate-50 mb-4 transition-all active:scale-[.98]"
          onClick={() => setView("profile")}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-extrabold text-slate-800">{profile.name}</p>
            <p className="text-xs text-slate-400">{profile.email}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>

        {/* settings rows */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-50">
          {/* About & App */}
          <button onClick={() => setShowAbout(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            style={{ borderBottom: "1px solid #f8fafc" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}>
              <Info className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">{t("appAboutUs")}</p>
              <p className="text-xs text-slate-400">{t("version")} · Nunu</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          {/* Mode */}
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #f8fafc" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
              {settings.mode === "light" ? <Sun className="w-[18px] h-[18px] text-white" /> : <Moon className="w-[18px] h-[18px] text-white" />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">{t("displayMode")}</p>
              <p className="text-xs text-slate-400">{settings.mode === "light" ? t("lightMode") : t("darkMode")}</p>
            </div>
            <button onClick={() => setSettings(s => ({ ...s, mode: s.mode === "light" ? "dark" : "light" }))}
              className="w-12 h-6 rounded-full relative transition-all duration-300"
              style={{ background: settings.mode === "dark" ? "#14B8A6" : "#e2e8f0" }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                style={{ left: settings.mode === "dark" ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>

          {/* Sound */}
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #f8fafc" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Volume2 className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">{t("soundAlerts")}</p>
              <p className="text-xs text-slate-400">{settings.sound ? "Notifications on" : "Muted"}</p>
            </div>
            <button onClick={() => setSettings(s => ({ ...s, sound: !s.sound }))}
              className="w-12 h-6 rounded-full relative transition-all duration-300"
              style={{ background: settings.sound ? "#14B8A6" : "#e2e8f0" }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                style={{ left: settings.sound ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>

          {/* Test Mobile Notification */}
          <button onClick={async () => {
            const granted = await requestNotificationPermission();
            if (granted) {
              await sendInstantNotification("💊 Nunu Pill Reminder Test", "Mobile APK local notifications are working perfectly!");
              alert("Test notification sent to your mobile device!");
            } else {
              alert("Notification permissions are not enabled. Please enable notification permissions in your phone settings.");
            }
          }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            style={{ borderBottom: "1px solid #f8fafc" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
              <Bell className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Test Mobile Notification</p>
              <p className="text-xs text-slate-400">Send instant test notification to device</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          {/* Customize */}
          <button onClick={() => {
            setTempNotificationType(settings.notificationType || "notification");
            setTempNotificationSound(settings.notificationSound || "default");
            setShowCustomize(true);
          }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            style={{ borderBottom: "1px solid #f8fafc" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
              <Palette className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">{t("customize")}</p>
              <p className="text-xs text-slate-400">Alarm, Notification & sounds</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          {/* Language */}
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #f8fafc" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0ea5e9,#0891b2)" }}>
              <Globe className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">{t("language")}</p>
              <p className="text-xs text-slate-400">{settings.language}</p>
            </div>
            <select value={settings.language} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
              className="text-xs font-bold text-slate-600 bg-slate-100 rounded-xl px-2 py-1 outline-none">
              {["English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam"].map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Gemini AI API Key */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
              <Key className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Google Gemini API Key</p>
              <p className="text-xs text-slate-400">
                {isGeminiConfigured() ? "API Key Active ✨" : "Key Required for AI Chat"}
              </p>
            </div>
            <button
              onClick={() => setIsAiOpen(true)}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-3 py-1.5 transition-all"
            >
              {isGeminiConfigured() ? "Manage" : "Configure"}
            </button>
          </div>
        </div>
        <div className="h-8" />

        {/* About sheet */}
        {showAbout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(15,23,42,.5)" }}
            onClick={e => e.target === e.currentTarget && setShowAbout(false)}>
            <div className="w-full max-w-[340px] bg-white rounded-[32px] p-6 space-y-4 shadow-2xl">
              <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200 mb-1" /></div>
              <div className="flex flex-col items-center gap-2 py-2 w-full">
                <NunuLogo className="h-24 w-auto mb-1" variant="colored" />
                <p className="text-sm text-slate-400 font-semibold">{t("version")}</p>
              </div>
              <p className="text-sm text-slate-500 text-center leading-relaxed">
                {t("aboutText")}
              </p>
              <p className="text-xs text-slate-400 text-center">
                {t("madeWith")}
              </p>
              <button onClick={() => setShowAbout(false)} className="w-full py-3 rounded-2xl text-sm font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}>{t("close")}</button>
            </div>
          </div>
        )}

        {/* Customize sheet */}
        {showCustomize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(15,23,42,.5)" }}
            onClick={e => e.target === e.currentTarget && setShowCustomize(false)}>
            <div className="w-full max-w-[340px] bg-white rounded-[32px] p-6 space-y-5 shadow-2xl">
              <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200 mb-1" /></div>

              <div>
                <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">Customize Notifications</h3>
                <p className="text-xs text-slate-400 font-semibold text-center leading-relaxed">
                  Choose alert delivery preference and notification sound.
                </p>
              </div>

              {/* Alert Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">Alert Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setTempNotificationType("notification")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${tempNotificationType === "notification"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    Notification
                  </button>
                  <button
                    onClick={() => setTempNotificationType("alarm")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${tempNotificationType === "alarm"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    Alarm
                  </button>
                </div>
              </div>

              {/* Sound Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">Notification Sound</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={tempNotificationSound}
                    onChange={e => {
                      const sound = e.target.value;
                      setTempNotificationSound(sound);
                      playPreviewSound(sound);
                    }}
                    className="flex-1 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500/30"
                  >
                    <option value="default">Default Ringtone</option>
                    <option value="chime">Xylo Chime</option>
                    <option value="beep">Alert Beep</option>
                    <option value="gentle">Gentle Harp</option>
                    <option value="digital">Digital Chirp</option>
                  </select>
                  <button
                    onClick={() => playPreviewSound(tempNotificationSound)}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95 flex-shrink-0"
                    title="Play Preview"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setSettings(s => ({
                    ...s,
                    notificationType: tempNotificationType,
                    notificationSound: tempNotificationSound
                  }));
                  setShowCustomize(false);
                }}
                className="w-full py-3 rounded-2xl text-sm font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
       PROFILE VIEW
    ═══════════════════════════════════════════════════════════ */
  function ProfileView() {
    const opts = [
      { icon: UserPlus, label: t("caretaker"), sub: `${caretakers.length} ${t("caretaker")}`, dest: "caretakers" as AppView, color: "#6366f1" },
      { icon: User, label: t("familyMembers"), sub: `${members.length} ${t("familyMembers")}`, dest: "family" as AppView, color: "#ec4899" },
      { icon: Stethoscope, label: t("doctorAppointment"), sub: `${appointments.length} ${t("upcoming")}`, dest: "doctor" as AppView, color: "#0ea5e9" },
    ];
    return (
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* avatar hero - clickable to show details sheet */}
        <button onClick={() => {
          setShowDetailsSheet(true);
          setIsEditingPassword(false);
        }} className="w-full flex flex-col items-center py-6 px-5 transition-all duration-200 hover:brightness-95 active:scale-[.99] outline-none text-left"
          style={{ background: "linear-gradient(135deg,#14B8A6 0%,#0ea5a0 55%,#0891b2 100%)" }}>
          <div className="w-20 h-20 rounded-3xl border-4 border-white/30 flex items-center justify-center mx-auto"
            style={{ background: "rgba(255,255,255,.2)" }}>
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-lg font-extrabold mt-3 text-center w-full">{profile.name}</h2>
        </button>

        {/* options */}
        <div className="px-4 py-4 bg-slate-50 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">

            {opts.map(o => {
              const Icon = o.icon;
              return (
                <button key={o.label} onClick={() => setView(o.dest)}
                  className="w-full flex items-center gap-4 p-4 rounded-3xl bg-white shadow-sm border border-slate-50 transition-all active:scale-[.98]">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: o.color + "15" }}>
                    <Icon className="w-6 h-6" style={{ color: o.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-extrabold text-slate-800">{o.label}</p>
                    <p className="text-xs text-slate-400">{o.sub}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
              );
            })}
          </div>

          {/* Session Debug Label */}
          <div className="text-[10px] text-slate-400 text-center font-bold bg-slate-100 p-2 rounded-2xl">
            Account: {session?.user?.email} <br />
            UID: {session?.user?.id}
          </div>

          {/* Logout Button */}
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 p-4 mt-2 rounded-3xl bg-rose-50 border border-rose-100/50 hover:bg-rose-100 active:scale-[.98] transition-all text-rose-600 font-extrabold text-sm shadow-sm">
            <LogOut className="w-5 h-5" />
            Logout Account
          </button>
        </div>

        {/* edit profile sheet */}
        {showEditProfile && (
          <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(15,23,42,.5)" }}
            onClick={e => e.target === e.currentTarget && setShowEditProfile(false)}>
            <div className="w-full bg-white rounded-t-3xl p-5 space-y-3">
              <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
              <h3 className="text-base font-extrabold text-slate-800">{t("myProfile")}</h3>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />Age</p>
                <input type="number" min="1" max="100" className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none"
                  style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                  value={editP.age || ""} onChange={e => setEditP(p => ({ ...p, age: Number(e.target.value) }))} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Palette className="w-3 h-3" />Gender</p>
                <select className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none"
                  style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                  value={editP.gender} onChange={e => setEditP(p => ({ ...p, gender: e.target.value }))}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button onClick={saveProfile} className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}>{t("saveChanges")}</button>
            </div>
          </div>
        )}

        {/* details overlay sheet */}
        {showDetailsSheet && (
          <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(15,23,42,.5)" }}
            onClick={e => e.target === e.currentTarget && setShowDetailsSheet(false)}>
            <div className="w-full bg-white rounded-t-3xl p-5 space-y-4 max-h-[85%] overflow-y-auto">
              <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800">My Details</h3>
                <button onClick={() => setShowDetailsSheet(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-3xl p-4 space-y-3">
                {/* Name */}
                <div className="py-1 border-b border-slate-200/50">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Name</p>
                  <p className="text-xs font-extrabold text-slate-800">{profile.name}</p>
                </div>
                {/* Email */}
                <div className="py-1 border-b border-slate-200/50">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-xs font-extrabold text-slate-800">{profile.email}</p>
                </div>
                {/* Age */}
                <div className="py-1 border-b border-slate-200/50">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Age</p>
                  <p className="text-xs font-extrabold text-slate-800">{profile.age ? `${profile.age} years` : "N/A"}</p>
                </div>
                {/* Gender */}
                <div className="py-1 border-b border-slate-200/50">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Gender</p>
                  <p className="text-xs font-extrabold text-slate-800 capitalize">{profile.gender || "N/A"}</p>
                </div>
                {/* Password Row */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex-1 mr-2">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Password</p>
                    {isEditingPassword ? (
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3 py-1.5 mt-1 rounded-xl text-xs font-semibold outline-none border border-slate-200 bg-white"
                        placeholder="Enter new password"
                      />
                    ) : (
                      <p className="text-xs font-extrabold text-slate-800">••••••••</p>
                    )}
                  </div>
                  {isEditingPassword ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={async () => {
                        setProfile(p => ({ ...p, password: newPassword }));
                        setIsEditingPassword(false);
                        try {
                          await supabase.from("profile").update({ password: newPassword }).eq("id", session?.user?.id);
                          showToast("Password updated successfully!", "success");
                        } catch (err) {
                          console.error(err);
                        }
                      }} className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditingPassword(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => {
                      setNewPassword(profile.password || "");
                      setIsEditingPassword(true);
                    }} className="w-8 h-8 rounded-xl bg-teal-50 hover:bg-teal-100 flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
                      <Pencil className="w-3.5 h-3.5 text-teal-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     CARETAKERS VIEW
  ═══════════════════════════════════════════════════════════ */
  function CaretakersView() {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
        {caretakers.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-4 bg-white rounded-3xl shadow-sm border border-slate-50">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#6366f115" }}>
              <User className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-800">{c.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <p className="text-xs text-slate-400">{c.phone}</p>
              </div>
            </div>
            <button onClick={() => deleteCaretaker(c.id)}
              className="w-9 h-9 rounded-2xl bg-red-50 flex items-center justify-center active:scale-90 transition-all">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ))}
        <button onClick={() => setShowAddCT(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border-2 border-dashed border-indigo-200 text-indigo-500 font-extrabold text-sm active:scale-[.98] transition-all">
          <Plus className="w-5 h-5" /> {t("addCaretaker")}
        </button>

        <Sheet show={showAddCT} onClose={() => setShowAddCT(false)} title={t("addCaretaker")}>
          <SInput label={t("fullName")} value={newCT.name} onChange={v => setNewCT(p => ({ ...p, name: v }))} placeholder="e.g. Priya Sharma" />
          <SInput label={t("phone")} value={newCT.phone} onChange={v => setNewCT(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" />
          <button onClick={addCaretaker} className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}>{t("saveCaretaker")}</button>
        </Sheet>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     FAMILY VIEW
  ═══════════════════════════════════════════════════════════ */
  function FamilyView() {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-4 bg-white rounded-3xl shadow-sm border border-slate-50">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#ec489915" }}>
              <User className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-800">{m.name}</p>
              <p className="text-xs text-slate-400">Tap + to add a reminder</p>
            </div>
            <button onClick={() => openMemberWizard(m.name)}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold transition-all active:scale-90 mr-1"
              style={{ background: "linear-gradient(135deg,#059669,#0d9488)" }}>
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={() => deleteMember(m.id)}
              className="w-9 h-9 rounded-2xl bg-red-50 flex items-center justify-center active:scale-90 transition-all">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ))}
        <button onClick={() => setShowAddMember(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border-2 border-dashed border-pink-200 text-pink-500 font-extrabold text-sm active:scale-[.98] transition-all">
          <UserPlus className="w-5 h-5" /> {t("addMember")}
        </button>

        <Sheet show={showAddMember} onClose={() => setShowAddMember(false)} title={t("addMember")}>
          <SInput label={t("relationName")} value={newMName} onChange={setNewMName} placeholder="e.g. Amma (Mom)" />
          <button onClick={addMember} className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>{t("addMember")}</button>
        </Sheet>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     DOCTOR VIEW
  ═══════════════════════════════════════════════════════════ */
  function DoctorView() {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
        {appointments.map(a => (
          <div key={a.id} className="p-4 bg-white rounded-3xl shadow-sm border border-slate-50">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#0ea5e915" }}>
                <Stethoscope className="w-5 h-5 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-800">{a.doctor}</p>
                <p className="text-xs font-bold text-sky-500">{a.specialty}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{a.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{fmtTime(a.time)}</span>
                  </div>
                </div>
                {a.notes && <p className="text-xs text-slate-400 mt-0.5">{a.notes}</p>}
              </div>
              {a.date >= TODAY && (
                <button onClick={() => {
                  setRescheduleAppt(a);
                  setReschedDate(a.date);
                  setReschedTime(a.time);
                }} className="w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-105 flex items-center justify-center flex-shrink-0 transition-colors active:scale-95">
                  <CalendarClock className="w-4.5 h-4.5 text-slate-500" />
                </button>
              )}
              <button onClick={() => deleteAppointment(a.id)} className="w-9 h-9 rounded-2xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center flex-shrink-0 transition-colors active:scale-95">
                <Trash2 className="w-4.5 h-4.5 text-rose-500" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setShowAddAppt(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border-2 border-dashed border-sky-200 text-sky-500 font-extrabold text-sm active:scale-[.98] transition-all">
          <Plus className="w-5 h-5" /> {t("addAppointment")}
        </button>

        <Sheet show={showAddAppt} onClose={() => setShowAddAppt(false)} title={t("addAppointment")}>
          <SInput label={t("doctorName")} value={newAppt.doctor} onChange={v => setNewAppt(p => ({ ...p, doctor: v }))} placeholder="Dr. Name" />
          <SInput label={t("specialty")} value={newAppt.specialty} onChange={v => setNewAppt(p => ({ ...p, specialty: v }))} placeholder="e.g. Cardiologist" />
          <div className="space-y-3">
            <SInput label={t("date")} value={newAppt.date} onChange={v => setNewAppt(p => ({ ...p, date: v }))} type="date" min={TODAY} />
            <SInput label={t("time")} value={newAppt.time} onChange={v => setNewAppt(p => ({ ...p, time: v }))} type="time" />
          </div>
          <SInput label={t("notes")} value={newAppt.notes} onChange={v => setNewAppt(p => ({ ...p, notes: v }))} placeholder="e.g. Bring blood reports" />
          <button onClick={addAppointment} className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0891b2)" }}>{t("saveAppointment")}</button>
        </Sheet>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PILL BOX VIEW
  ═══════════════════════════════════════════════════════════ */
  const [stockSearchQuery, setStockSearchQuery] = useState("");

  function addOrUpdateStock() {
    if (!newStockPill.name.trim()) return;
    const stockVal = parseFloat(newStockPill.stock) || 0;
    const minStockVal = parseFloat(newStockPill.minStock) || 0;
    
    setPillStocks(prev => {
      const exists = prev.some(p => p.name.toLowerCase() === newStockPill.name.trim().toLowerCase());
      if (exists && !editingStockName) {
        return prev.map(p => p.name.toLowerCase() === newStockPill.name.trim().toLowerCase() ? {
          ...p,
          stock: stockVal,
          minStock: minStockVal,
          type: newStockPill.type
        } : p);
      } else if (editingStockName) {
        return prev.map(p => p.name.toLowerCase() === editingStockName.toLowerCase() ? {
          ...p,
          name: newStockPill.name.trim(),
          stock: stockVal,
          minStock: minStockVal,
          type: newStockPill.type
        } : p);
      } else {
        return [...prev, {
          name: newStockPill.name.trim(),
          stock: stockVal,
          minStock: minStockVal,
          type: newStockPill.type
        }];
      }
    });
    
    setNewStockPill({ name: "", stock: "", minStock: "", type: "Tablet" });
    setShowAddStock(false);
    setEditingStockName(null);
  }

  function deleteStock(name: string) {
    setPillStocks(prev => prev.filter(p => p.name !== name));
  }

  function PillBoxView() {
    const filteredStocks = pillStocks.filter(p =>
      p.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
    );

    const lowStockCount = pillStocks.filter(p => p.stock <= p.minStock).length;

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
        {/* Dashboard / Summary Card */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-650 text-white rounded-3xl p-4 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-100 font-bold uppercase tracking-wider">Stock Summary</p>
            <h4 className="text-xl font-black mt-1">{pillStocks.length} Medications</h4>
            {lowStockCount > 0 ? (
              <p className="text-xs text-rose-200 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 fill-rose-500 text-teal-600" /> {lowStockCount} items running low!
              </p>
            ) : (
              <p className="text-xs text-emerald-200 font-semibold mt-1">All items well stocked! ✨</p>
            )}
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Pill className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search stock..."
              value={stockSearchQuery}
              onChange={e => setStockSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-teal-400"
            />
          </div>
          <button
            onClick={() => {
              setNewStockPill({ name: "", stock: "", minStock: "", type: "Tablet" });
              setEditingStockName(null);
              setShowAddStock(true);
            }}
            className="h-10 px-4 rounded-2xl bg-teal-500 text-white text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
        </div>

        {/* Stock List */}
        <div className="space-y-3">
          {filteredStocks.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 p-6">
              <p className="text-sm font-bold text-slate-400">No stocks found</p>
              <p className="text-xs text-slate-400 mt-1">Tap 'Add Stock' to keep track of your pill counts.</p>
            </div>
          ) : (
            filteredStocks.map(p => {
              const isLow = p.stock <= p.minStock;
              return (
                <div key={p.name} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: isLow ? "#f43f5e12" : "#10b98112" }}>
                    <Pill className={`w-6 h-6 ${isLow ? 'text-rose-500' : 'text-emerald-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-800 truncate">{p.name}</p>
                      {p.type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {p.type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Available</span>
                        <span className={`text-xs font-black ${isLow ? 'text-rose-600' : 'text-slate-700'}`}>
                          {p.stock} Qty
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Min Stock Limit</span>
                        <span className="text-xs font-bold text-slate-600">
                          {p.minStock} Qty
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setNewStockPill({ name: p.name, stock: String(p.stock), minStock: String(p.minStock), type: p.type || "Tablet" });
                        setEditingStockName(p.name);
                        setShowAddStock(true);
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center active:scale-95 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => deleteStock(p.name)}
                      className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center active:scale-95 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Stock Sheet */}
        <Sheet
          show={showAddStock}
          onClose={() => {
            setShowAddStock(false);
            setEditingStockName(null);
          }}
          title={editingStockName ? "Edit Pill Stock" : "Add Pill Stock"}
        >
          <SInput
            label="Medication Name"
            value={newStockPill.name}
            onChange={v => setNewStockPill(p => ({ ...p, name: v }))}
            placeholder="e.g. Paracetamol"
          />
          <div className="mb-4">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Pill Type</label>
            <select
              value={newStockPill.type}
              onChange={e => setNewStockPill(p => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {PILL_TYPES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SInput
              label="Stock Count"
              value={newStockPill.stock}
              onChange={v => setNewStockPill(p => ({ ...p, stock: v }))}
              placeholder="e.g. 50"
              type="number"
            />
            <SInput
              label="Min Stock Warning"
              value={newStockPill.minStock}
              onChange={v => setNewStockPill(p => ({ ...p, minStock: v }))}
              placeholder="e.g. 10"
              type="number"
            />
          </div>
          <button
            onClick={addOrUpdateStock}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white mt-4 transition-transform active:scale-98"
            style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
          >
            {editingStockName ? "Save Changes" : "Add Medication"}
          </button>
        </Sheet>
      </div>
    );
  }



  /* ═══════════════════════════════════════════════════════════
     WIZARD SHEET
  ═══════════════════════════════════════════════════════════ */
  function WizardSheet() {
    if (!wizard) return null;
    const { kind, step, data, forMember } = wizard;
    const total = totalSteps(wizard, pillStocks);
    const pctW = Math.round(((step + 1) / total) * 100);
    const last = isLastStep(wizard, pillStocks);

    let emoji = "💊", title = "", content: React.ReactNode = null;

    /* ── MAIN PILL wizard ── */
    if (kind === "mainPill") {
      const choice = data.choice;
      if (!choice) {
        title = "Add New Reminder"; emoji = "➕";
        content = (
          <div className="space-y-3 mt-2">
            <button
              onClick={() => wUpdate({ choice: "medicine" })}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-200 hover:border-[#14B8A6] hover:bg-[#EFF6FF] transition-all active:scale-[.98] shadow-sm text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <CustomIcon name="pill" className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-slate-800">Medicine Name</p>
                <p className="text-xs text-slate-400">Add a pill schedule with details</p>
              </div>
            </button>
            <button
              onClick={() => wUpdate({ choice: "other" })}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-200 hover:border-[#14B8A6] hover:bg-[#EFF6FF] transition-all active:scale-[.98] shadow-sm text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <CustomIcon name="others" className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-slate-800">Other Reminder</p>
                <p className="text-xs text-slate-400">Add general reminder (Dates & time)</p>
              </div>
            </button>
            <button
              onClick={() => wUpdate({ choice: "appointment" })}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-200 hover:border-[#14B8A6] hover:bg-[#EFF6FF] transition-all active:scale-[.98] shadow-sm text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-[#14B8A6]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-slate-800">Doctor Appointment</p>
                <p className="text-xs text-slate-400">Schedule a visit to the doctor</p>
              </div>
            </button>
          </div>
        );
      } else if (choice === "medicine") {
        switch (step) {
          case 1: {
            title = t("pillNameQuest"); emoji = "💊";
            const query = data.pillName || "";
            const dynamicSuggested = Array.from(new Set([
              ...SUGGESTED_PILLS,
              ...pillStocks.map(p => p.name),
              ...customPillNames,
              ...reminders.filter(r => r.label).map(r => r.label)
            ])).sort((a, b) => a.localeCompare(b));
            const filtered = query.trim()
              ? dynamicSuggested.filter(p => p.toLowerCase().startsWith(query.toLowerCase())).slice(0, 30)
              : [];
            content = (
              <div className="relative">
                <SInput value={query} onChange={v => {
                  const matched = pillStocks.find(s => s.name && s.name.toLowerCase() === v.trim().toLowerCase());
                  if (matched) {
                    wUpdate({ pillName: v, pillType: matched.type, inventory: matched.stock, minStock: matched.minStock });
                  } else {
                    wUpdate({ pillName: v });
                  }
                }} placeholder="e.g. Paracetamol" hasError={wizardError} shake={shakeWizard} />
                {filtered.length > 0 && (
                  <div className="mt-1.5 border border-slate-100 rounded-2xl bg-white shadow-lg z-30 max-h-48 overflow-y-auto">
                    {filtered.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const matched = pillStocks.find(s => s.name && s.name.toLowerCase() === p.trim().toLowerCase());
                          if (matched) {
                            wUpdate({ pillName: p, pillType: matched.type, inventory: matched.stock, minStock: matched.minStock });
                          } else {
                            wUpdate({ pillName: p });
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                      >
                        🔍 {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
            break;
          }
          case 2:
            title = t("pillTypeQuest"); emoji = "🔬";
            content = <OptionGrid items={PILL_TYPES.map(l => ({ label: l }))} dataKey="pillType" wizardData={data} onUpdate={wUpdate} />;
            break;
          case 3: {
            const isSyrup = data.pillType === "Syrup";
            const isInj = data.pillType === "Injection";
            const isDrops = data.pillType === "Drops";
            const isPowder = data.pillType === "Powder";
            const isInhaler = data.pillType === "Inhaler";

            title = isSyrup
              ? "Volume per dose (ml)"
              : isDrops
                ? "Drops per dose"
                : isInj
                  ? "Units or ml per dose"
                  : isPowder
                    ? "Quantity per dose (sachet, g, mg)"
                    : isInhaler
                      ? "Puffs per dose"
                      : t("pillDoseQuest") || "Pills per dose";

            emoji = isSyrup ? "🧪" : isDrops ? "💧" : isInj ? "💉" : isPowder ? "🧂" : isInhaler ? "💨" : "🔢";

            const placeholder = isSyrup
              ? "e.g. 5 or 10"
              : isDrops
                ? "e.g. 3 or 5"
                : isInj
                  ? "e.g. 10 or 0.5"
                  : isPowder
                    ? "e.g. 1 sachet or 5g"
                    : isInhaler
                      ? "e.g. 1 or 2"
                      : data.pillType === "Capsule"
                        ? "e.g. 1 or 2"
                        : "e.g. 1 or 0.5";

            const helperText = isSyrup
              ? "Amount of syrup to take in ml"
              : isDrops
                ? "Number of drops to take"
                : isInj
                  ? "Specify dosage units or volume for injection"
                  : isPowder
                    ? "Amount of powder (e.g. 1 sachet, 500mg, 5g)"
                    : isInhaler
                      ? "Number of inhaler puffs to take"
                      : data.pillType === "Capsule"
                        ? "Number of capsules to take (whole numbers only)"
                        : data.pillType === "Tablet"
                          ? "Number of tablets to take (decimals like 0.5 allowed)"
                          : "Number of pills/tablets/capsules to take";

            content = (
              <>
                <SInput value={data.pillCount || ""} onChange={v => wUpdate({ pillCount: v })} placeholder={placeholder} type="text" hasError={wizardError} shake={shakeWizard} />
                <p className="text-xs text-slate-400 mt-1 ml-1">
                  {helperText}
                </p>
              </>
            );
            break;
          }
          case 4:
            title = t("pillFreqQuest"); emoji = "🔄";
            content = <OptionGrid items={FREQ_OPTS} dataKey="frequency" wizardData={data} onUpdate={wUpdate} />;
            break;
          case 5:
            title = t("startDateQuest"); emoji = "📅";
            content = <SInput label="Start Date" value={data.startDate || ""} onChange={v => wUpdate({ startDate: v })} type="date" min={TODAY} hasError={wizardError} shake={shakeWizard} />;
            break;
          case 6:
            title = t("endDateQuest"); emoji = "🗓️";
            content = <SInput label={`${t("endDateQuest")} (optional)`} value={data.endDate || ""} onChange={v => wUpdate({ endDate: v })} type="date" min={data.startDate || TODAY} />;
            break;
          case 7: {
            title = t("timesQuest"); emoji = "⏰";
            const freq = FREQ_OPTS.find(f => f.val === data.frequency || f.key === data.frequency) || FREQ_OPTS[0];
            content = (
              <div className="space-y-4">
                <TimeInputs 
                  count={freq.count} 
                  slots={freq.slots} 
                  data={data} 
                  wUpdate={wUpdate} 
                  activeTimeSlot={activeTimeSlot} 
                  setActiveTimeSlot={setActiveTimeSlot} 
                />
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500">Alert Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: false })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === false || data.alarmMode === undefined
                          ? "bg-teal-50 border-teal-500 text-teal-650"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🔔 Notification
                    </button>
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: true })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === true
                          ? "bg-teal-50 border-teal-500 text-teal-650 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🚨 Continuous Alarm
                    </button>
                  </div>
                </div>
              </div>
            );
            break;
          }
          case 8:
            title = t("invQuest"); emoji = "🗃️";
            content = (
              <>
                <SInput value={data.inventory || ""} onChange={v => wUpdate({ inventory: v })} placeholder="e.g. 30" type="number" />
                <p className="text-xs text-slate-400 mt-1 ml-1">How many pills do you have right now? (Optional)</p>
              </>
            );
            break;
          case 9:
            title = t("stockQuest"); emoji = "⚠️";
            content = (
              <>
                <SInput value={data.minStock || ""} onChange={v => wUpdate({ minStock: v })} placeholder="e.g. 5" type="number" />
                <p className="text-xs text-slate-400 mt-1 ml-1">Alert when inventory falls below this number (Optional)</p>
              </>
            );
            break;
        }
      } else if (choice === "appointment") {
        switch (step) {
          case 1:
            title = "Doctor's Name"; emoji = "👨‍⚕️";
            content = <SInput value={data.doctor || ""} onChange={v => wUpdate({ doctor: v })} placeholder="e.g. Dr. Priya Sharma" hasError={wizardError} shake={shakeWizard} />;
            break;
          case 2:
            title = "Specialty"; emoji = "🩺";
            content = <SInput value={data.specialty || ""} onChange={v => wUpdate({ specialty: v })} placeholder="e.g. Cardiologist (optional)" />;
            break;
          case 3:
            title = "Date & Time"; emoji = "📅";
            content = (
              <div className="space-y-3">
                <SInput label="Date" value={data.date || ""} onChange={v => wUpdate({ date: v })} type="date" min={TODAY} hasError={wizardError} shake={shakeWizard} />
                <SInput label="Time" value={data.time || ""} onChange={v => wUpdate({ time: v })} type="time" hasError={wizardError} shake={shakeWizard} />
              </div>
            );
            break;
          case 4:
            title = "Add notes? (Optional)"; emoji = "📝";
            content = (
              <>
                <textarea rows={3} value={data.notes || ""} onChange={e => wUpdate({ notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none resize-none mt-1"
                  style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#1e293b" }} />
                <button onClick={wSkip} className="text-sm font-bold text-[#14B8A6] underline w-full text-center mt-2">
                  Skip notes
                </button>
              </>
            );
            break;
        }
      } else if (choice === "other") {
        switch (step) {
          case 1:
            title = "What would you like to be reminded about?"; emoji = "⭐";
            content = (
              <textarea rows={4} value={data.description || ""} onChange={e => wUpdate({ description: e.target.value })}
                placeholder={wizardError ? "Please enter a value!" : "Describe your reminder..."}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none resize-none mt-1 transition-all ${wizardError && shakeWizard ? "animate-shake" : ""
                  }`}
                style={{
                  background: wizardError ? "#fef2f2" : "#f8fafc",
                  border: wizardError ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                  color: wizardError ? "#991b1b" : "#1e293b"
                }} />
            );
            break;
          case 2:
            title = "Start & End Date"; emoji = "📅";
            content = (
              <div className="space-y-3">
                <SInput label="Start Date" value={data.startDate || ""} onChange={v => wUpdate({ startDate: v })} type="date" min={TODAY} hasError={wizardError} shake={shakeWizard} />
                <SInput label="End Date (optional)" value={data.endDate || ""} onChange={v => wUpdate({ endDate: v })} type="date" min={data.startDate || TODAY} />
              </div>
            );
            break;
          case 3:
            title = "Set Reminder Time"; emoji = "⏰";
            content = (
              <div className="space-y-4">
                <SInput label="Time" value={data.reminderTime || ""} onChange={v => wUpdate({ reminderTime: v })} type="time" hasError={wizardError} shake={shakeWizard} />
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500">Alert Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: false })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === false || data.alarmMode === undefined
                          ? "bg-teal-50 border-teal-500 text-teal-650"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🔔 Notification
                    </button>
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: true })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === true
                          ? "bg-teal-50 border-teal-500 text-teal-650 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🚨 Continuous Alarm
                    </button>
                  </div>
                </div>
              </div>
            );
            break;
        }
      }
    }

    /* ── MEMBER REMINDER wizard ── */
    if (kind === "memberReminder") {
      const rType = data.reminderType;

      if (step === 0) {
        title = `Reminder for ${forMember}`; emoji = "⭐";
        content = (
          <div className="grid grid-cols-3 gap-2.5 mt-2">
            {REM_TYPES.map(rt => {
              const sel = rType === rt.key;
              return (
                <button key={rt.key} onClick={() => wUpdate({ reminderType: rt.key })}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-150 active:scale-95 border"
                  style={{
                    height: "92px",
                    background: sel ? "#EFF6FF" : "#ffffff",
                    color: sel ? "#14B8A6" : "#1e293b",
                    borderColor: sel ? "#14B8A6" : "rgba(0,0,0,0.06)",
                    borderWidth: sel ? "2px" : "1px",
                    boxShadow: sel ? "0 4px 14px rgba(20,184,166,0.18)" : "0 2px 4px rgba(0,0,0,0.02)"
                  }}>
                  <div className="w-10 h-10 flex items-center justify-center mb-1">
                    <CustomIcon name={rt.key} className="w-9 h-9" />
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full text-center">{rt.label}</span>
                </button>
              );
            })}
          </div>
        );
      } else {
        /* ── pill sub-flow (steps 1-9) ── */
        if (rType === "pill") {
          const s = step - 1;
          switch (s) {
            case 0: {
              title = t("pillNameQuest"); emoji = "💊";
              const query = data.pillName || "";
              const dynamicSuggested = Array.from(new Set([
                ...SUGGESTED_PILLS,
                ...pillStocks.map(p => p.name)
              ])).sort((a, b) => a.localeCompare(b));
              const filtered = query.trim()
                ? dynamicSuggested.filter(p => p.toLowerCase().startsWith(query.toLowerCase())).slice(0, 30)
                : [];
              content = (
                <div className="relative">
                  <SInput value={query} onChange={v => wUpdate({ pillName: v })} placeholder="e.g. Vitamin C" hasError={wizardError} shake={shakeWizard} />
                  {filtered.length > 0 && (
                    <div className="mt-1.5 border border-slate-100 rounded-2xl bg-white shadow-lg z-30 max-h-48 overflow-y-auto">
                      {filtered.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => wUpdate({ pillName: p })}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                        >
                          🔍 {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
              break;
            }
            case 1: title = t("pillTypeQuest"); emoji = "🔬";
              content = <OptionGrid items={PILL_TYPES.map(l => ({ label: l }))} dataKey="pillType" wizardData={data} onUpdate={wUpdate} />;
              break;
            case 2: {
              const isSyrup = data.pillType === "Syrup";
              const isInj = data.pillType === "Injection";
              const isDrops = data.pillType === "Drops";
              const isPowder = data.pillType === "Powder";
              const isInhaler = data.pillType === "Inhaler";

              title = isSyrup
                ? "Volume per dose (ml)"
                : isDrops
                  ? "Drops per dose"
                  : isInj
                    ? "Units or ml per dose"
                    : isPowder
                      ? "Quantity per dose (sachet, g, mg)"
                      : isInhaler
                        ? "Puffs per dose"
                        : t("pillDoseQuest") || "Pills per dose";

              emoji = isSyrup ? "🧪" : isDrops ? "💧" : isInj ? "💉" : isPowder ? "🧂" : isInhaler ? "💨" : "🔢";

              const placeholder = isSyrup
                ? "e.g. 5 or 10"
                : isDrops
                  ? "e.g. 3 or 5"
                  : isInj
                    ? "e.g. 10 or 0.5"
                    : isPowder
                      ? "e.g. 1 sachet or 5g"
                      : isInhaler
                        ? "e.g. 1 or 2"
                        : "e.g. 1 or 0.5";

              const helperText = isSyrup
                ? "Amount of syrup to take in ml"
                : isDrops
                  ? "Number of drops to take"
                  : isInj
                    ? "Specify dosage units or volume for injection"
                    : isPowder
                      ? "Amount of powder (e.g. 1 sachet, 500mg, 5g)"
                      : isInhaler
                        ? "Number of inhaler puffs to take"
                        : "Number of tablets/capsules to take (decimals like 0.5 allowed)";

              content = (
                <>
                  <SInput value={data.pillCount || ""} onChange={v => wUpdate({ pillCount: v })} placeholder={placeholder} type="text" hasError={wizardError} shake={shakeWizard} />
                  <p className="text-xs text-slate-400 mt-1 ml-1">
                    {helperText}
                  </p>
                </>
              );
              break;
            }
            case 3: title = t("pillFreqQuest"); emoji = "🔄";
              content = <OptionGrid items={FREQ_OPTS} dataKey="frequency" wizardData={data} onUpdate={wUpdate} />;
              break;
            case 4: title = t("startDateQuest"); emoji = "📅";
              content = <SInput label="Start Date" value={data.startDate || ""} onChange={v => wUpdate({ startDate: v })} type="date" min={TODAY} hasError={wizardError} shake={shakeWizard} />;
              break;
            case 5: title = t("endDateQuest"); emoji = "🗓️";
              content = <SInput label={`${t("endDateQuest")} (optional)`} value={data.endDate || ""} onChange={v => wUpdate({ endDate: v })} type="date" min={data.startDate || TODAY} />;
              break;
            case 6: {
              title = t("timesQuest"); emoji = "⏰";
              const freq = FREQ_OPTS.find(f => f.val === data.frequency || f.key === data.frequency) || FREQ_OPTS[0];
              content = (
                <div className="space-y-4">
                  <TimeInputs 
                    count={freq.count} 
                    slots={freq.slots} 
                    data={data} 
                    wUpdate={wUpdate} 
                    activeTimeSlot={activeTimeSlot} 
                    setActiveTimeSlot={setActiveTimeSlot} 
                  />
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-500">Alert Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => wUpdate({ alarmMode: false })}
                        className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                          data.alarmMode === false || data.alarmMode === undefined
                            ? "bg-teal-50 border-teal-500 text-teal-650"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        🔔 Notification
                      </button>
                      <button
                        type="button"
                        onClick={() => wUpdate({ alarmMode: true })}
                        className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                          data.alarmMode === true
                            ? "bg-teal-50 border-teal-500 text-teal-650 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        🚨 Continuous Alarm
                      </button>
                    </div>
                  </div>
                </div>
              );
              break;
            }
            case 7: title = t("invQuest"); emoji = "🗃️";
              content = (
                <>
                  <SInput value={data.inventory || ""} onChange={v => wUpdate({ inventory: v })} placeholder="e.g. 30" type="number" />
                  <p className="text-xs text-slate-400 mt-1 ml-1">How many pills do you have right now? (Optional)</p>
                </>
              );
              break;
            case 8: title = t("stockQuest"); emoji = "⚠️";
              content = (
                <>
                  <SInput value={data.minStock || ""} onChange={v => wUpdate({ minStock: v })} placeholder="e.g. 5" type="number" />
                  <p className="text-xs text-slate-400 mt-1 ml-1">Alert when inventory falls below this number (Optional)</p>
                </>
              );
              break;
          }
        }

        /* ── others sub-flow (steps 1-2) ── */
        else if (rType === "others") {
          if (step === 1) {
            title = "Describe your purpose"; emoji = "⭐";
            content = (
              <textarea rows={4} value={data.description || ""} onChange={e => wUpdate({ description: e.target.value })}
                placeholder={wizardError ? "Please enter a value!" : "What would you like to be reminded about?"}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none resize-none mt-1 transition-all ${wizardError && shakeWizard ? "animate-shake" : ""
                  }`}
                style={{
                  background: wizardError ? "#fef2f2" : "#f8fafc",
                  border: wizardError ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                  color: wizardError ? "#991b1b" : "#1e293b"
                }} />
            );
          } else {
            title = "Date & Time"; emoji = "📅";
            content = (
              <div className="space-y-4 mt-1">
                <SInput label="Date" value={data.reminderDate || ""} onChange={v => wUpdate({ reminderDate: v })} type="date" min={TODAY} hasError={wizardError} shake={shakeWizard} />
                <SInput label="Time" value={data.reminderTime || ""} onChange={v => wUpdate({ reminderTime: v })} type="time" hasError={wizardError} shake={shakeWizard} />
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500">Alert Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: false })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === false || data.alarmMode === undefined
                          ? "bg-teal-50 border-teal-500 text-teal-650"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🔔 Notification
                    </button>
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: true })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === true
                          ? "bg-teal-50 border-teal-500 text-teal-650 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🚨 Continuous Alarm
                    </button>
                  </div>
                </div>
              </div>
            );
          }
        }

        /* ── general sub-flow (steps 1-3) ── */
        else {
          const rt = REM_TYPES.find(r => r.key === rType);
          if (step === 1) {
            title = "Add notes? (Optional)"; emoji = "📝";
            content = (
              <>
                <textarea rows={3} value={data.notes || ""} onChange={e => wUpdate({ notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none resize-none mt-1"
                  style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#1e293b" }} />
                <button onClick={wSkip} className="text-sm font-bold text-emerald-600 underline w-full text-center">
                  Skip notes
                </button>
              </>
            );
          } else {
            title = "Date & Time"; emoji = "📅";
            content = (
              <div className="space-y-4 mt-1">
                <SInput label="Date" value={data.reminderDate || ""} onChange={v => wUpdate({ reminderDate: v })} type="date" min={TODAY} hasError={wizardError} shake={shakeWizard} />
                <SInput label="End Date (optional)" value={data.endDate || ""} onChange={v => wUpdate({ endDate: v })} type="date" min={data.reminderDate || TODAY} />
                <SInput label="Time" value={data.reminderTime || ""} onChange={v => wUpdate({ reminderTime: v })} type="time" hasError={wizardError} shake={shakeWizard} />
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500">Alert Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: false })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === false || data.alarmMode === undefined
                          ? "bg-teal-55 border-teal-500 text-teal-650"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🔔 Notification
                    </button>
                    <button
                      type="button"
                      onClick={() => wUpdate({ alarmMode: true })}
                      className={`py-3 px-2 rounded-2xl text-[10px] font-extrabold border transition-all ${
                        data.alarmMode === true
                          ? "bg-teal-55 border-teal-500 text-teal-650 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🚨 Continuous Alarm
                    </button>
                  </div>
                </div>
              </div>
            );
          }
        }
      }
    }

    return (
      <div className="absolute inset-0 z-40 flex flex-col justify-center items-center px-4"
        style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(8px)" }}
        onClick={e => e.target === e.currentTarget && setWizard(null)}>
        <div className="bg-white rounded-[32px] w-full max-w-[340px] flex flex-col"
          style={{ maxHeight: "85%", boxShadow: "0 20px 50px rgba(0,0,0,.2)" }}>

          {/* drag handle removed for modal look */}
          <div className="pt-4" />

          {/* progress */}
          {step > 0 && (
            <div className="px-5 pt-3 pb-1 flex-shrink-0">
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((step / (total - 1)) * 100)}%`, background: "linear-gradient(90deg,#059669,#0d9488)" }} />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Step {step} of {total - 1}</p>
            </div>
          )}

          {/* body */}
          <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: "none" }}>
            {renderWizardIcon(emoji)}
            <h3 className="text-lg font-extrabold text-slate-800 text-center mb-3">{title}</h3>
            {forMember && step === 0 && (
              <p className="text-xs text-center text-slate-400 mb-2">
                For: <span className="font-extrabold text-indigo-500">{forMember}</span>
              </p>
            )}
            {content}
          </div>

          {/* buttons */}
          {!(kind === "mainPill" && step === 0) && (
            <div className="flex gap-3 px-5 pb-8 pt-3 flex-shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
              {step > 0 && (
                <button onClick={wBack}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold bg-slate-100 text-slate-650 active:scale-95 transition-all">
                  ← Back
                </button>
              )}
              <button onClick={wNext}
                className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg,#059669,#0d9488)", boxShadow: "0 6px 16px rgba(5,150,105,.3)" }}>
                {last ? "✅ Add to Schedule" : "Next →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     NOTIFICATIONS SHEET
  ═══════════════════════════════════════════════════════════ */
  function NotifSheet() {
    if(!showNotif) return null;
    const missed=reminders.filter(r=>!r.taken&&r.date<TODAY);
    const pending=reminders.filter(r=>!r.taken&&r.date===TODAY);
    const fam=reminders.filter(r=>!!r.forMember);
    return (
      <div className="absolute inset-0 z-40 flex flex-col justify-end"
        style={{background:"rgba(15,23,42,.5)",backdropFilter:"blur(4px)"}}
        onClick={e=>e.target===e.currentTarget&&setShowNotif(false)}>
        <div className="bg-white rounded-t-3xl flex flex-col" style={{maxHeight:"78%",boxShadow:"0 -20px 60px rgba(0,0,0,.15)"}}>
          <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-slate-200"/></div>
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
            <h3 className="text-base font-extrabold text-slate-800">🔔 Notifications</h3>
            <button onClick={()=>setShowNotif(false)} className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-500"/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4" style={{scrollbarWidth:"none"}}>
            {missed.length>0 && (
              <div>
                <p className="text-xs font-extrabold text-red-500 mb-2">❌ Missed Medications ({missed.length})</p>
                <div className="space-y-2">
                  {missed.map(r=>(
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-100">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-red-700">{r.label}</p>
                        <p className="text-[10px] text-red-400">{r.date} · {r.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pending.length>0 && (
              <div>
                <p className="text-xs font-extrabold text-amber-500 mb-2">⏰ Pending Today ({pending.length})</p>
                <div className="space-y-2">
                  {pending.map(r=>(
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100">
                      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-amber-700">{r.label}</p>
                        <p className="text-[10px] text-amber-400">{r.time} · {r.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fam.length>0 && (
              <div>
                <p className="text-xs font-extrabold text-indigo-500 mb-2">👨‍👩‍👧 Family Reminders ({fam.length})</p>
                <div className="space-y-2">
                  {fam.map(r=>(
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                      <span className="text-lg">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-indigo-700">
                          {r.label} <span className="text-indigo-400 font-semibold">→ {r.forMember}</span>
                        </p>
                        <p className="text-[10px] text-indigo-400">{r.date} · {r.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {missed.length===0&&pending.length===0&&fam.length===0 && (
              <div className="flex flex-col items-center py-10">
                <span className="text-4xl mb-2">✅</span>
                <p className="text-sm font-bold text-slate-400">All caught up! No notifications.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     AI CHAT SHEET
  ═══════════════════════════════════════════════════════════ */
  function AISheet() {
    if(!showAI) return null;
    return (
      <div className="absolute inset-0 z-40 flex flex-col justify-end"
        style={{background:"rgba(15,23,42,.55)",backdropFilter:"blur(8px)"}}
        onClick={e=>e.target===e.currentTarget&&setShowAI(false)}>
        <div className="bg-white rounded-t-3xl flex flex-col" style={{maxHeight:"78%",boxShadow:"0 -20px 60px rgba(0,0,0,.15)"}}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-slate-200"/></div>
          <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#7c3aed,#6366f1)"}}>
              <Bot className="w-6 h-6 text-white"/>
            </div>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-slate-800">Nunu AI</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <p className="text-xs text-emerald-600 font-semibold">Online · Ready to help</p>
              </div>
            </div>
            <button onClick={()=>setShowAI(false)} className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-500"/>
            </button>
          </div>
          <div className="h-px bg-slate-100 mx-5"/>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{scrollbarWidth:"none"}}>
            {aiMsgs.map((m,i)=>(
              <div key={i} className={`flex gap-2 ${m.role==="user"?"flex-row-reverse":"flex-row"}`}>
                {m.role==="ai" && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                    style={{background:"linear-gradient(135deg,#7c3aed,#6366f1)"}}>
                    <Bot className="w-4 h-4 text-white"/>
                  </div>
                )}
                <div className="max-w-[78%] px-4 py-2.5 text-sm font-semibold leading-relaxed"
                  style={{background:m.role==="user"?"linear-gradient(135deg,#059669,#0d9488)":"#f8fafc",
                          color:m.role==="user"?"#fff":"#1e293b",
                          borderRadius:m.role==="user"?"20px 20px 4px 20px":"4px 20px 20px 20px",
                          boxShadow:m.role==="user"?"0 4px 12px rgba(5,150,105,.3)":"0 2px 8px rgba(0,0,0,.06)"}}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2.5 items-center px-5 pb-8 pt-3 flex-shrink-0" style={{borderTop:"1px solid #f1f5f9"}}>
            <input className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold outline-none"
              style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",color:"#1e293b"}}
              placeholder="Ask about your medication..."
              value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAI()}/>
            <button onClick={sendAI}
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
              style={{background:aiInput.trim()?"linear-gradient(135deg,#7c3aed,#6366f1)":"#f1f5f9",
                      boxShadow:aiInput.trim()?"0 6px 16px rgba(124,58,237,.35)":"none"}}>
              <Send className="w-5 h-5" style={{color:aiInput.trim()?"#fff":"#94a3b8"}}/>
            </button>
          </div>
        </div>
      </div>
    );
  }
  /* ═══════════════════════════════════════════════════════════
     SLEEP SHEET
  ═══════════════════════════════════════════════════════════ */
  function SleepSheet() {
    return (
      <Sheet show={showLogSleep} onClose={() => setShowLogSleep(false)} title="Log Sleep Cycle">
        <div className="space-y-4 pt-2 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">🛏️ Bedtime</label>
              <input 
                type="time" 
                value={bedtime} 
                onChange={e => setBedtime(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none bg-slate-50 border border-slate-200 text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">🌅 Wake Up</label>
              <input 
                type="time" 
                value={waketime} 
                onChange={e => setWaketime(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none bg-slate-50 border border-slate-200 text-slate-800"
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-500">😌 Sleep Quality</label>
              <span className="text-xs font-black text-indigo-600">{sleepQuality}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={sleepQuality} 
              onChange={e => setSleepQuality(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
              <span>Restless</span>
              <span>Good</span>
              <span>Excellent</span>
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/30">
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Calculated Duration: <span className="font-extrabold text-indigo-600">{calculateHours(bedtime, waketime)} hours</span>. 
              Adequate sleep boosts immunity and enhances heart health.
            </p>
          </div>

          <button 
            onClick={() => {
              setSleepHours(calculateHours(bedtime, waketime));
              setShowLogSleep(false);
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-extrabold transition-all shadow-md active:scale-95"
          >
            Save Sleep Log
          </button>
        </div>
      </Sheet>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     BP SHEET
  ═══════════════════════════════════════════════════════════ */
  function BPSheet() {
    const bpClassPreview = getBPClass(tempSystolic, tempDiastolic);
    return (
      <Sheet show={showLogBP} onClose={() => setShowLogBP(false)} title="Log Blood Pressure">
        <div className="space-y-4 pt-2 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Systolic (mmHg)</label>
              <input 
                type="number" 
                value={tempSystolic} 
                onChange={e => setTempSystolic(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none bg-slate-50 border border-slate-200 text-slate-800"
                placeholder="120"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Diastolic (mmHg)</label>
              <input 
                type="number" 
                value={tempDiastolic} 
                onChange={e => setTempDiastolic(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none bg-slate-50 border border-slate-200 text-slate-800"
                placeholder="80"
              />
            </div>
          </div>

          <div className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-500">Classification:</span>
            <div 
              className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1"
              style={{ backgroundColor: bpClassPreview.bg, color: bpClassPreview.text }}
            >
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: bpClassPreview.color }} />
              {bpClassPreview.label}
            </div>
          </div>

          <button 
            onClick={() => {
              if(tempSystolic > 0 && tempDiastolic > 0) {
                setBpSystolic(tempSystolic);
                setBpDiastolic(tempDiastolic);
                setShowLogBP(false);
              }
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-extrabold transition-all shadow-md active:scale-95"
          >
            Save BP Reading
          </button>
        </div>
      </Sheet>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PULSE SCANNER SHEET
  ═══════════════════════════════════════════════════════════ */
  function PulseScannerSheet() {
    if (!showPulseScanner) return null;

    return (
      <div className="absolute inset-0 z-40 flex flex-col justify-end"
        style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(8px)" }}>
        <div className="bg-white rounded-t-[32px] p-6 space-y-5 flex flex-col relative max-h-[85%] shadow-2xl transition-all"
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800">Biometric Pulse Scanner</h3>
            <button 
              onClick={() => {
                stopScanning();
                setShowPulseScanner(false);
              }} 
              className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {scanState !== "complete" ? (
            <div className="flex flex-col items-center text-center py-4 space-y-6">
              <p className="text-xs text-slate-500 font-semibold max-w-[280px] leading-relaxed">
                {scanState === "scanning" 
                  ? "Hold your finger on the sensor below. Staying still ensures accuracy." 
                  : "Press and hold the sensor button below to begin scanning your real-time heart rate."
                }
              </p>

              {/* Live ECG wave during scan */}
              <div className="w-full h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden relative px-4">
                <svg className="w-full h-8 text-rose-500" viewBox="0 0 200 40">
                  <path 
                    d="M 0,20 L 40,20 L 48,5 L 56,35 L 64,20 L 100,20 L 108,5 L 116,35 L 124,20 L 160,20 L 168,5 L 176,35 L 184,20 L 200,20" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={scanState === "scanning" ? "animate-ecg" : "opacity-30"}
                  />
                </svg>
                {scanState === "scanning" && (
                  <span className="absolute right-3 top-2 text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md animate-pulse">
                    Live ECG
                  </span>
                )}
              </div>

              {/* Glowing finger pad button */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Ripples */}
                {scanState === "scanning" && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-rose-400/20 animate-ripple" style={{ animationDelay: '0s' }} />
                    <div className="absolute inset-2 rounded-full bg-rose-400/30 animate-ripple" style={{ animationDelay: '0.6s' }} />
                    <div className="absolute inset-4 rounded-full bg-rose-400/40 animate-ripple" style={{ animationDelay: '1.2s' }} />
                  </>
                )}

                <button
                  onMouseDown={startScanning}
                  onMouseUp={stopScanning}
                  onMouseLeave={stopScanning}
                  onTouchStart={startScanning}
                  onTouchEnd={stopScanning}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 outline-none select-none ${
                    scanState === "scanning" 
                      ? "bg-rose-600 scale-105 shadow-[0_0_25px_#f43f5e]" 
                      : "bg-rose-50 border-2 border-rose-200/80 hover:bg-rose-100/50 active:scale-95 shadow-md"
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  {/* Scanner Sweep Line */}
                  {scanState === "scanning" && (
                    <div className="absolute left-0 right-0 h-1.5 bg-rose-300 shadow-[0_0_12px_#fca5a5] animate-scanline" />
                  )}
                  
                  <Heart className={`w-8 h-8 transition-transform ${
                    scanState === "scanning" ? "text-white animate-heartpulse scale-110" : "text-rose-500 animate-pulse"
                  }`} />
                  
                  <span className={`text-[8px] font-bold mt-1 tracking-wider uppercase select-none ${
                    scanState === "scanning" ? "text-rose-100" : "text-rose-600"
                  }`}>
                    {scanState === "scanning" ? "Scanning" : "Hold"}
                  </span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Sensor Calibration</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-100 ease-out" 
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-6 space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 text-3xl">
                ✓
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">Your Heart Rate</p>
                <p className="text-5xl font-black text-slate-800 tracking-tight">
                  {heartRate} <span className="text-xl font-bold text-slate-400">BPM</span>
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider mt-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  Normal Resting
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Your reading of {heartRate} BPM is in the normal range for healthy adults (60-100 BPM). Excellent job staying calm and still!
                </p>
              </div>

              <button 
                onClick={() => setShowPulseScanner(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-extrabold transition-all shadow-md active:scale-95"
              >
                Close and Save
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     ROOT RENDER
The above content shows the entire, complete file contents of the requested file.


  /* ═══════════════════════════════════════════════════════════
     ROOT RENDER
  ═══════════════════════════════════════════════════════════ */
  const isCapacitorOrMobile = typeof window !== "undefined" && (
    (window as any).Capacitor !== undefined ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  const wrapperStyle = isCapacitorOrMobile ? {
    fontFamily: "'Nunito',sans-serif",
    width: "100%",
    height: "100vh",
    margin: 0,
    padding: 0
  } : {
    fontFamily: "'Nunito',sans-serif",
    background: "linear-gradient(135deg,#e0f7fa 0%,#f0fdf4 50%,#eff6ff 100%)",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px"
  };

  const wrapperClass = isCapacitorOrMobile ? "" : "min-h-screen flex items-center justify-center p-3";

  const containerStyle = isCapacitorOrMobile ? {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    position: "relative" as const,
    overflow: "hidden" as const,
    background: "#f8fafc"
  } : {
    width: "100%",
    maxWidth: "390px",
    height: "820px",
    display: "flex",
    flexDirection: "column" as const,
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: "44px",
    boxShadow: "0 40px 80px rgba(20,184,166,.12), 0 0 0 1px rgba(255,255,255,.7)",
    background: "#f8fafc"
  };

  const containerClass = isCapacitorOrMobile ? "w-full h-full flex flex-col relative overflow-hidden" : "w-full max-w-[390px] flex flex-col relative overflow-hidden";

  const splashContainerStyle = isCapacitorOrMobile ? {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden" as const,
    background: "linear-gradient(135deg,#14B8A6 0%,#0ea5a0 55%,#0891b2 100%)"
  } : {
    width: "100%",
    maxWidth: "390px",
    height: "820px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: "44px",
    boxShadow: "0 40px 80px rgba(20,184,166,.12), 0 0 0 1px rgba(255,255,255,.7)",
    background: "linear-gradient(135deg,#14B8A6 0%,#0ea5a0 55%,#0891b2 100%)"
  };

  const splashContainerClass = isCapacitorOrMobile ? "w-full h-full flex flex-col items-center justify-center relative overflow-hidden" : "w-full max-w-[390px] flex flex-col items-center justify-center relative overflow-hidden";

  const loadingContainerStyle = isCapacitorOrMobile ? {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden" as const,
    background: "#f8fafc"
  } : {
    width: "100%",
    maxWidth: "390px",
    height: "820px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: "44px",
    boxShadow: "0 40px 80px rgba(20,184,166,.12), 0 0 0 1px rgba(255,255,255,.7)",
    background: "#f8fafc"
  };

  const loadingContainerClass = isCapacitorOrMobile ? "w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#f8fafc]" : "w-full max-w-[390px] flex flex-col items-center justify-center relative overflow-hidden bg-[#f8fafc]";

  const overlayClass = isCapacitorOrMobile
    ? "absolute inset-0 z-50 flex flex-col justify-between bg-[#f8fafc] p-6 animate-in fade-in duration-300"
    : "absolute inset-0 z-50 flex flex-col justify-between bg-[#f8fafc] p-6 animate-in fade-in duration-300 rounded-[44px]";

  const overlayStyle = isCapacitorOrMobile ? {} : { height: "820px" };

  if (showSplash) {
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className={splashContainerClass} style={splashContainerStyle}>
          <style>{`
            @keyframes splashFadeIn {
              0% { opacity: 0; transform: scale(0.9); }
              100% { opacity: 1; transform: scale(1); }
            }
            .animate-splash {
              animation: splashFadeIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="animate-splash flex flex-col items-center">
            <NunuLogo className="h-36 w-auto mb-2" variant="white" />
          </div>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className={loadingContainerClass} style={loadingContainerStyle}>
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#14B8A6]"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className={containerClass} style={containerStyle}>
          {toast && (
            <div className="absolute top-4 left-4 right-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 ${toast.type === "error"
                ? "bg-red-50/95 border-red-200/50 text-red-800"
                : "bg-emerald-50/95 border-emerald-200/50 text-emerald-800"
                }`}>
                {toast.type === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
                <p className="text-xs font-bold leading-snug flex-1">{toast.message}</p>
                <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <AuthView showToast={showToast} t={t} setSession={setSession} />
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className={containerClass} style={containerStyle}>
          {toast && (
            <div className="absolute top-4 left-4 right-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 ${toast.type === "error"
                ? "bg-red-50/95 border-red-200/50 text-red-800"
                : "bg-emerald-50/95 border-emerald-200/50 text-emerald-800"
                }`}>
                {toast.type === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
                <p className="text-xs font-bold leading-snug flex-1">{toast.message}</p>
                <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <OnboardingView session={session} onComplete={handleOnboardingComplete} t={t} />
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <div className={containerClass} style={containerStyle}>

        {/* Floating Custom Premium Toast */}
        {toast && (
          <div className="absolute top-4 left-4 right-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 ${toast.type === "error"
              ? "bg-red-50/95 border-red-200/50 text-red-800"
              : "bg-emerald-50/95 border-emerald-200/50 text-emerald-800"
              }`}>
              {toast.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              )}
              <p className="text-xs font-bold leading-snug flex-1">{toast.message}</p>
              <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {/* Live Notification Floating Banner (iOS style) or Full Screen Alarm */}
        {(() => {
          const active = activeLiveNotification;
          if (!active) return null;

          // If the user clicked "Skipped" and we are prompting for a reason:
          if (skippingReminder && skippingReminder.id === active.id) {
            const reasons = [
              { label: "Work / Busy", emoji: "💼" },
              { label: "Travel / Transit", emoji: "✈️" },
              { label: "Slept / Rested", emoji: "😴" },
              { label: "Forgot / Missed", emoji: "🧠" },
              { label: "Side Effects", emoji: "🤢" },
              { label: "Out of Stock", emoji: "📦" }
            ];

            return (
              <div className="absolute top-4 left-4 right-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-6">
                <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-teal-600 uppercase">Reason for Skipping</span>
                    <button onClick={() => setSkippingReminder(null)} className="text-slate-400 hover:text-slate-650">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">
                      Why are you skipping {active.label}?
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {reasons.map((r) => (
                      <button
                        key={r.label}
                        onClick={() => {
                          skipReminder(active.id, r.label);
                          setActiveLiveNotification(null);
                          setSkippingReminder(null);
                          showToast(`Medication skipped: ${r.label}`, "success");
                        }}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-left text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-100/70 transition-all"
                      >
                        <span className="text-sm">{r.emoji}</span>
                        <span className="truncate">{r.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setSkippingReminder(null)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 font-extrabold text-xs transition-all text-center mt-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          // Full Screen Alarm View
          const isAlarm = active.alarmMode === true || active.alarmMode === "true" || settings.notificationType === "alarm";
          const isMed = active.emoji === "💊" || active.emoji === "🧪" || active.emoji === "💉";

          if (isAlarm) {
            return (
              <div className={overlayClass} style={overlayStyle}>
                {/* Background glowing rings */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-40">
                  <div className="w-[300px] h-[300px] rounded-full border border-teal-200/50 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-[200px] h-[200px] rounded-full border border-teal-200/50 animate-ping" style={{ animationDuration: '4s' }} />
                </div>

                {/* Top header */}
                <div className="relative z-10 flex flex-col items-center pt-8 text-center space-y-2">
                  <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse border border-teal-100">
                    🚨 Active Alarm 🚨
                  </span>
                  <span className="text-xs text-slate-400 font-bold">{active.time}</span>
                </div>

                {/* Center Content with pulsing icon */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-teal-500/5 animate-ripple" style={{ animationDelay: '0s' }} />
                    <div className="absolute inset-2 rounded-full bg-teal-500/10 animate-ripple" style={{ animationDelay: '0.6s' }} />
                    
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-teal-500 flex items-center justify-center shadow-[0_4px_24px_rgba(20,184,166,0.15)] animate-heartpulse">
                      <CustomIcon name={active.emoji || "pill"} className="w-16 h-16" />
                    </div>
                  </div>

                  <div className="space-y-2 px-4">
                    <h2 className="text-3xl font-black tracking-tight text-slate-800">{active.label}</h2>
                    <p className="text-sm text-slate-500 font-semibold">{active.sub}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="relative z-10 space-y-3 pb-8">
                  <button
                    onClick={() => {
                      toggleTaken(active.id);
                      setActiveLiveNotification(null);
                      showToast(isMed ? "Medication marked as taken!" : "Reminder marked as done!", "success");
                    }}
                    className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-600 active:scale-95 text-white font-extrabold text-base transition-all shadow-[0_4px_20px_rgba(20,184,166,0.25)] text-center flex items-center justify-center"
                  >
                    {isMed ? "Take Medication" : "Done"}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSkippingReminder(active);
                      }}
                      className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-650 font-extrabold text-sm transition-all text-center"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleRem(active);
                        setReschedDate(active.date);
                        const rawTime = active.time;
                        let hh = 12;
                        let mm = 0;
                        const match = rawTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (match) {
                          let hour = parseInt(match[1]);
                          const min = parseInt(match[2]);
                          const ampm = match[3].toUpperCase();
                          if (ampm === "PM" && hour < 12) hour += 12;
                          if (ampm === "AM" && hour === 12) hour = 0;
                          hh = hour;
                          mm = min;
                        }
                        setReschedTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);

                        const dateMatch = active.sub.match(/From\s+([\d-]+)\s+to\s+([\d-]+|Ongoing)/);
                        if (dateMatch) {
                          const endD = dateMatch[2];
                          if (endD === "Ongoing") {
                            setIsOngoing(true);
                            setReschedEndDate("");
                          } else {
                            setIsOngoing(false);
                            setReschedEndDate(endD);
                          }
                        } else {
                          setIsOngoing(false);
                          setReschedEndDate("");
                        }
                        setActiveLiveNotification(null);
                      }}
                      className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-sm transition-all text-center"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Floating iOS-style Notification Banner (Light Theme)
          return (
            <div className="absolute top-4 left-4 right-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-6">
              <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-teal-500 flex items-center justify-center">
                      <Pill className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-extrabold tracking-wider text-teal-600 uppercase">NUNU ALARM</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">Now</span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    {getEmojiChar(active.emoji)} {active.label}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{active.sub}</p>
                  <p className="text-[10px] text-teal-600 font-bold mt-1">Scheduled Time: {active.time}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button onClick={() => {
                    toggleTaken(active.id);
                    setActiveLiveNotification(null);
                    showToast(isMed ? "Medication marked as taken!" : "Reminder marked as done!", "success");
                  }} className="py-2 rounded-xl bg-teal-500 hover:bg-teal-600 active:scale-95 text-white font-extrabold text-xs transition-all text-center">
                    {isMed ? "Take" : "Done"}
                  </button>
                  <button onClick={() => {
                    setSkippingReminder(active);
                  }} className="py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold text-xs transition-all text-center">
                    Skipped
                  </button>
                  <button onClick={() => {
                    setRescheduleRem(active);
                    setReschedDate(active.date);
                    const rawTime = active.time;
                    let hh = 12;
                    let mm = 0;
                    const match = rawTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                      let hour = parseInt(match[1]);
                      const min = parseInt(match[2]);
                      const ampm = match[3].toUpperCase();
                      if (ampm === "PM" && hour < 12) hour += 12;
                      if (ampm === "AM" && hour === 12) hour = 0;
                      hh = hour;
                      mm = min;
                    }
                    setReschedTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);

                    const dateMatch = active.sub.match(/From\s+([\d-]+)\s+to\s+([\d-]+|Ongoing)/);
                    if (dateMatch) {
                      const endD = dateMatch[2];
                      if (endD === "Ongoing") {
                        setIsOngoing(true);
                        setReschedEndDate("");
                      } else {
                        setIsOngoing(false);
                        setReschedEndDate(endD);
                      }
                    } else {
                      setIsOngoing(false);
                      setReschedEndDate("");
                    }
                    setActiveLiveNotification(null);
                  }} className="py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs transition-all text-center">
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {activeSleepAlarm && (() => {
          const message = activeSleepAlarm === "sleep" ? "it's time to sleep" : "its time to wakeup";
          const title = activeSleepAlarm === "sleep" ? "Bedtime Alert" : "Wake Up Alert";
          const emoji = activeSleepAlarm === "sleep" ? "🛌" : "🌅";

          if (showSnoozeSelection) {
            return (
              <div className={overlayClass} style={overlayStyle}>
                {/* Top header */}
                <div className="relative z-10 flex flex-col items-center pt-8 text-center space-y-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-wider border border-indigo-100">
                    ⏰ Snooze Duration
                  </span>
                  <p className="text-xs text-slate-400 font-bold">Select snooze interval</p>
                </div>

                {/* Center choices */}
                <div className="relative z-10 space-y-3 px-4 py-8 flex-1 flex flex-col justify-center">
                  {snoozeOptions.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => handleSnoozeClick(opt.val)}
                      className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 active:scale-95 transition-all text-center shadow-sm"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Cancel button */}
                <div className="relative z-10 pb-8">
                  <button
                    onClick={() => setShowSnoozeSelection(false)}
                    className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-505 font-extrabold text-base transition-all text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className={overlayClass} style={overlayStyle}>
              {/* Background glowing rings */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-40">
                <div className="w-[300px] h-[300px] rounded-full border border-indigo-200/50 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute w-[200px] h-[200px] rounded-full border border-indigo-200/50 animate-ping" style={{ animationDuration: '4s' }} />
              </div>

              {/* Top header */}
              <div className="relative z-10 flex flex-col items-center pt-8 text-center space-y-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse border border-indigo-100">
                  🚨 Sleep Cycle Alarm 🚨
                </span>
                <span className="text-xs text-slate-400 font-bold">Now</span>
              </div>

              {/* Center Content with pulsing icon */}
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/5 animate-ripple" style={{ animationDelay: '0s' }} />
                  <div className="absolute inset-2 rounded-full bg-indigo-500/10 animate-ripple" style={{ animationDelay: '0.6s' }} />
                  
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center shadow-[0_4px_24px_rgba(99,102,241,0.15)] animate-heartpulse">
                    <span className="text-4xl">{emoji}</span>
                  </div>
                </div>

                <div className="space-y-2 px-4">
                  <h2 className="text-3xl font-black tracking-tight text-slate-800">{message}</h2>
                  <p className="text-sm text-slate-500 font-semibold">{title}</p>
                </div>
              </div>

              {/* Dismiss & Snooze Buttons */}
              <div className="relative z-10 space-y-3 pb-8">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setActiveSleepAlarm(null);
                      showToast("Alarm dismissed", "success");
                    }}
                    className="py-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-750 font-extrabold text-base transition-all text-center flex items-center justify-center"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setShowSnoozeSelection(true);
                    }}
                    className="py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-base transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] text-center flex items-center justify-center"
                  >
                    Snooze
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {/* ── Sub-pages ─────────────────────────────────────── */}
        {view === "profile" && (
          <>{SubHeader({ title: t("myProfile"), onBack: () => setView("main") })}{ProfileView()}</>
        )}
        {view === "caretakers" && (
          <>{SubHeader({ title: t("caretakers"), onBack: () => setView("profile") })}{CaretakersView()}</>
        )}
        {view === "family" && (
          <>{SubHeader({ title: t("familyMembers"), onBack: () => setView("profile") })}{FamilyView()}</>
        )}
        {view === "doctor" && (
          <>{SubHeader({ title: t("doctorAppointments"), onBack: () => setView("profile") })}{DoctorView()}</>
        )}
        {view === "pillbox" && (
          <>{SubHeader({ title: "Medicine Box Stock Manager", onBack: () => setView("main") })}{PillBoxView()}</>
        )}

        {/* ── Main view ─────────────────────────────────────── */}
        {view === "main" && (
          <>
            {MainHeader()}
            {activeNav === "today" && TodayView()}
            {activeNav === "progress" && <div className="flex-1 overflow-hidden flex flex-col">{ProgressView()}</div>}
            {activeNav === "health" && <div className="flex-1 overflow-hidden flex flex-col">{HealthView()}</div>}
            {activeNav === "settings" && <div className="flex-1 overflow-hidden flex flex-col">{SettingsView()}</div>}

            {/* Global FABs */}
            {activeNav === "today" && (
              <div className="absolute bottom-20 right-4 flex flex-col items-end gap-3 z-20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-white text-emerald-600 shadow-md"
                    style={{ boxShadow: "0 4px 12px rgba(16,185,129,.2)" }}>{t("askAI")}</span>
                  <button onClick={() => setIsAiOpen(true)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 8px 24px rgba(16,185,129,.4)" }}>
                    <Bot className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-white shadow-md"
                    style={{ color: "#14B8A6", boxShadow: "0 4px 12px rgba(20,184,166,0.2)" }}>{t("addPill")}</span>
                  <button onClick={openMainPillWizard}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)", boxShadow: "0 10px 28px rgba(20,184,166,0.45)" }}>
                    <Plus className="w-7 h-7 text-white" />
                  </button>
                </div>
              </div>
            )}

            {BottomNav()}
          </>
        )}

        {/* ── Global overlays ───────────────────────────────── */}
        {NotifSheet()}
        {AISheet()}
        <GeminiChatModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} language={settings.language} />
        {WizardSheet()}
        {SleepSheet()}
        {BPSheet()}
        {PulseScannerSheet()}


        {/* Reschedule Overlay */}
        {rescheduleRem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)" }}
            onClick={e => e.target === e.currentTarget && setRescheduleRem(null)}>
            <div className="w-full max-w-[390px] bg-white rounded-[32px] p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#14B8A6]" /> Reschedule Reminder
              </h3>
              <p className="text-xs text-slate-500 font-bold -mt-2">Rescheduling: <span className="text-[#14B8A6]">{rescheduleRem.label}</span></p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">New Date</p>
                  <input type="date" className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none"
                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                    value={reschedDate} onChange={e => setReschedDate(e.target.value)} min={TODAY} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">New Time</p>
                  <input type="time" className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none"
                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                    value={reschedTime} onChange={e => setReschedTime(e.target.value)} />
                </div>
                {rescheduleRem.sub.match(/From\s+([\d-]+)\s+to\s+([\d-]+|Ongoing)/) && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1">New End Date</p>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={isOngoing} onChange={e => setIsOngoing(e.target.checked)} className="rounded text-[#14B8A6] focus:ring-[#14B8A6]" />
                        Ongoing
                      </label>
                    </div>
                    {!isOngoing && (
                      <input type="date" className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border"
                        style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                        value={reschedEndDate} onChange={e => setReschedEndDate(e.target.value)} min={reschedDate || TODAY} />
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setRescheduleRem(null)} className="flex-1 py-3 rounded-2xl text-sm font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Cancel
                </button>
                <button onClick={async () => {
                  try {
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

                    if (reschedDate < TODAY) {
                      showToast("Cannot reschedule to a past date.", "error");
                      return;
                    }
                    if (reschedDate === TODAY && reschedTime <= currentTimeStr) {
                      showToast("Cannot reschedule to a past time today.", "error");
                      return;
                    }

                    const formattedTime = fmtTime(reschedTime);

                    let newSub = rescheduleRem.sub;
                    const dateMatch = rescheduleRem.sub.match(/From\s+([\d-]+)\s+to\s+([\d-]+|Ongoing)/);
                    if (dateMatch) {
                      const endStr = isOngoing ? "Ongoing" : reschedEndDate;
                      newSub = rescheduleRem.sub.replace(/From\s+([\d-]+)\s+to\s+([\d-]+|Ongoing)/, `From ${reschedDate} to ${endStr}`);
                    }

                    setReminders(prev => prev.map(r => r.id === rescheduleRem.id ? { ...r, date: reschedDate, time: formattedTime, sub: newSub } : r));

                    const { error } = await supabase.from("reminders").update({
                      date: reschedDate,
                      time: formattedTime,
                      sub: newSub
                    }).eq("id", rescheduleRem.id);

                    if (error) {
                      console.error("Error rescheduling reminder:", error);
                      showToast("Supabase Error: " + error.message, "error");
                    }
                  } catch (err) {
                    console.error("Error rescheduling:", err);
                  } finally {
                    setRescheduleRem(null);
                  }
                }} className="flex-1 py-3 rounded-2xl text-sm font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#14B8A6,#0ea5a0)" }}>
                  Save Time
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Appointment Overlay */}
        {rescheduleAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)" }}
            onClick={e => e.target === e.currentTarget && setRescheduleAppt(null)}>
            <div className="w-full max-w-[390px] bg-white rounded-[32px] p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#0ea5e9]" /> Reschedule Appointment
              </h3>
              <p className="text-xs text-slate-500 font-bold -mt-2">Rescheduling: <span className="text-[#0ea5e9]">{rescheduleAppt.doctor}</span></p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">New Date</p>
                  <input type="date" className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border"
                    style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                    value={reschedDate} onChange={e => setReschedDate(e.target.value)} min={TODAY} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">New Time</p>
                  <input type="time" className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border"
                    style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                    value={reschedTime} onChange={e => setReschedTime(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setRescheduleAppt(null)} className="flex-1 py-3 rounded-2xl text-sm font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Cancel
                </button>
                <button onClick={async () => {
                  try {
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

                    if (reschedDate < TODAY) {
                      showToast("Cannot reschedule to a past date.", "error");
                      return;
                    }
                    if (reschedDate === TODAY && reschedTime <= currentTimeStr) {
                      showToast("Cannot reschedule to a past time today.", "error");
                      return;
                    }

                    // Update appointments local state
                    setAppointments(prev => prev.map(a => a.id === rescheduleAppt.id ? { ...a, date: reschedDate, time: reschedTime } : a));

                    // Update Supabase
                    const { error } = await supabase.from("appointments").update({
                      date: reschedDate,
                      time: reschedTime
                    }).eq("id", rescheduleAppt.id);

                    if (error) {
                      console.error("Error rescheduling appointment:", error);
                    }
                  } catch (err) {
                    console.error("Error rescheduling appointment:", err);
                  } finally {
                    setRescheduleAppt(null);
                  }
                }} className="flex-1 py-3 rounded-2xl text-sm font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#0891b2)" }}>
                  Save Time
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Doctor Appointment Notification Popover Banner */}
        {activeApptNotification && (() => {
          const appt = activeApptNotification;
          return (
            <div className="absolute top-4 left-4 right-4 z-50 transition-all duration-350 animate-in fade-in slide-in-from-top-6">
              <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-sky-500 flex items-center justify-center">
                      <Stethoscope className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-extrabold tracking-wider text-sky-600 uppercase">Doctor Appointment</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">Now</span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    🩺 {appt.doctor}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{appt.specialty}</p>
                  {appt.notes && <p className="text-[10px] text-slate-400 mt-1 italic">{appt.notes}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => {
                    setActiveApptNotification(null);
                    showToast("Appointment alert dismissed", "success");
                  }} className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-650 font-extrabold text-xs transition-all text-center">
                    Dismiss
                  </button>
                  <button onClick={() => {
                    setRescheduleAppt(appt);
                    setReschedDate(appt.date);
                    setReschedTime(appt.time);
                    setActiveApptNotification(null);
                  }} className="py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-extrabold text-xs transition-all text-center">
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Custom Delete Confirmation Overlay */}
        {deletingRem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3" style={{ background: "rgba(15,23,42,.5)" }}
            onClick={e => e.target === e.currentTarget && setDeletingRem(null)}>
            <div className="w-full max-w-[390px] bg-white rounded-t-3xl p-5 space-y-4 shadow-xl relative" style={{ borderBottomRightRadius: "44px", borderBottomLeftRadius: "44px" }}>
              <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
              <div className="flex flex-col items-center text-center space-y-2 py-2">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">Delete Reminder</h3>
                <p className="text-xs font-semibold text-slate-500 max-w-[280px]">
                  Delete <span className="font-extrabold text-slate-800">"{deletingRem.label}"</span>? Choose to delete only this occurrence, or this and all subsequent ones.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <button onClick={async () => {
                    await deleteReminder(deletingRem.id, false);
                    setDeletingRem(null);
                  }} className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white bg-red-500 hover:bg-red-650 active:scale-95 transition-all"
                    style={{ boxShadow: "0 4px 12px rgba(239,68,68,0.2)" }}>
                    This Day Only
                  </button>
                  <button onClick={async () => {
                    await deleteReminder(deletingRem.id, true);
                    setDeletingRem(null);
                  }} className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white bg-rose-700 hover:bg-rose-800 active:scale-95 transition-all"
                    style={{ boxShadow: "0 4px 12px rgba(190,24,74,0.2)" }}>
                    This & Future
                  </button>
                </div>
                <button onClick={() => setDeletingRem(null)} className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
