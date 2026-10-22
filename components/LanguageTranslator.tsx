"use client";

import { useEffect } from "react";

const bn: Record<string, string> = {
  Dashboard: "ড্যাশবোর্ড", Sales: "বিক্রয়", Customers: "গ্রাহক", Areas: "এলাকা", Villages: "গ্রাম",
  Products: "পণ্য", Payments: "পেমেন্ট", Returns: "ফেরত", Settings: "সেটিংস", Reports: "রিপোর্ট",
  "Detailed Sales Report": "বিস্তারিত বিক্রয় রিপোর্ট", "Product Return Report": "পণ্য ফেরত রিপোর্ট",
  "Customer Reports": "গ্রাহক রিপোর্ট", "Customer Due Report": "গ্রাহক বকেয়া রিপোর্ট", "Payment History": "পেমেন্ট ইতিহাস",
  "Business Settings": "ব্যবসার সেটিংস", "New Sale": "নতুন বিক্রয়", "Add New Sale": "নতুন বিক্রয় যোগ করুন",
  "New Customer": "নতুন গ্রাহক", "Customer Details": "গ্রাহকের বিস্তারিত", "New Area": "নতুন এলাকা",
  "Edit Area": "এলাকা সম্পাদনা", "New Village": "নতুন গ্রাম", "Edit Village": "গ্রাম সম্পাদনা",
  "Customer Payments": "গ্রাহক পেমেন্ট", "Customer Payment History": "গ্রাহক পেমেন্ট ইতিহাস",
  "Lite POS": "লাইট পিওএস", "Sales made simple": "সহজ বিক্রয় ব্যবস্থাপনা", "Sign in to continue": "চালিয়ে যেতে সাইন ইন করুন",
  "Log out": "লগ আউট", Refresh: "রিফ্রেশ", "New sale": "নতুন বিক্রয়", "Today's business at a glance": "আজকের ব্যবসার এক নজর",
  "Today's sales": "আজকের বিক্রয়", "Net sales": "নিট বিক্রয়", "Return & refund": "ফেরত ও রিফান্ড",
  Collections: "আদায়", "Total due": "মোট বকেয়া", "Customer advance": "গ্রাহক অগ্রিম", Invoices: "ইনভয়েস",
  Today: "আজ", "Recent sales": "সাম্প্রতিক বিক্রয়", "Top products": "শীর্ষ পণ্য", sold: "বিক্রিত",
  Customer: "গ্রাহক", Date: "তারিখ", Status: "অবস্থা", Total: "মোট", Invoice: "ইনভয়েস",
  Code: "কোড", Name: "নাম", Phone: "ফোন", Email: "ইমেইল", Address: "ঠিকানা", Balance: "ব্যালেন্স",
  Area: "এলাকা", Village: "গ্রাম", "Area / Village": "এলাকা / গ্রাম", Actions: "কার্যক্রম",
  View: "দেখুন", Print: "প্রিন্ট", Edit: "সম্পাদনা", Delete: "মুছুন", Add: "যোগ করুন", Save: "সংরক্ষণ",
  active: "সক্রিয়", inactive: "নিষ্ক্রিয়", cancelled: "বাতিল", Active: "সক্রিয়", Inactive: "নিষ্ক্রিয়",
  "All Areas": "সব এলাকা", "All Villages": "সব গ্রাম", "All Customers": "সব গ্রাহক", "All products": "সব পণ্য",
  "Choose area": "এলাকা নির্বাচন করুন", "Choose village": "গ্রাম নির্বাচন করুন", "Choose area first": "আগে এলাকা নির্বাচন করুন",
  "Choose customer": "গ্রাহক নির্বাচন করুন", "Search customer": "গ্রাহক খুঁজুন", "Search customers": "গ্রাহক খুঁজুন",
  "No customer found": "কোনো গ্রাহক পাওয়া যায়নি", "Customer name": "গ্রাহকের নাম", "Phone number": "ফোন নম্বর",
  "Opening due": "প্রারম্ভিক বকেয়া", "Opening amount": "প্রারম্ভিক পরিমাণ", "Opening type": "প্রারম্ভিক ধরন",
  "Opening date": "প্রারম্ভিক তারিখ", Due: "বকেয়া", Advance: "অগ্রিম", due: "বকেয়া", advance: "অগ্রিম",
  "Save Customer": "গ্রাহক সংরক্ষণ", "Save customer": "গ্রাহক সংরক্ষণ", "Customer saved": "গ্রাহক সংরক্ষিত হয়েছে",
  "Customer created and selected": "গ্রাহক তৈরি ও নির্বাচন করা হয়েছে", Notes: "নোট", "Customer setup, opening balance, and current account position": "গ্রাহক, প্রারম্ভিক ব্যালেন্স ও বর্তমান হিসাব ব্যবস্থাপনা",
  "Create areas before adding villages and customers": "গ্রাম ও গ্রাহক যোগ করার আগে এলাকা তৈরি করুন",
  "Each village belongs to one area": "প্রতিটি গ্রাম একটি এলাকার অন্তর্ভুক্ত", "Add Area": "এলাকা যোগ করুন", "Add Village": "গ্রাম যোগ করুন",
  "Area name": "এলাকার নাম", "Village name": "গ্রামের নাম", "Save Area": "এলাকা সংরক্ষণ", "Save Village": "গ্রাম সংরক্ষণ",
  "No areas yet. Add the first area to create villages.": "এখনও কোনো এলাকা নেই। গ্রাম তৈরির জন্য প্রথম এলাকা যোগ করুন।",
  "No villages yet. Add an area first, then create its villages.": "এখনও কোনো গ্রাম নেই। আগে এলাকা যোগ করে তারপর গ্রাম তৈরি করুন।",
  "Type a product name or select a previous suggestion": "পণ্যের নাম লিখুন অথবা আগের তালিকা থেকে নির্বাচন করুন",
  "Sale date": "বিক্রয়ের তারিখ", Product: "পণ্য", Qty: "পরিমাণ", Price: "দাম", Discount: "ছাড়",
  "Add row": "সারি যোগ করুন", "Payment summary": "পেমেন্ট সারাংশ", Subtotal: "উপমোট", "Line discount": "পণ্য ছাড়",
  "Invoice discount": "ইনভয়েস ছাড়", "Grand total": "সর্বমোট", "Paid amount (Cash)": "পরিশোধিত পরিমাণ (নগদ)",
  "Full Pay": "সম্পূর্ণ পরিশোধ",
  "Save sale": "বিক্রয় সংরক্ষণ", "Saving…": "সংরক্ষণ হচ্ছে…", "Sale saved successfully": "বিক্রয় সফলভাবে সংরক্ষিত হয়েছে",
  "View, fully edit, print, or delete invoices": "ইনভয়েস দেখুন, সম্পাদনা, প্রিন্ট বা মুছুন", Paid: "পরিশোধিত",
  "Search invoice/customer": "ইনভয়েস/গ্রাহক খুঁজুন", "Print Invoice": "ইনভয়েস প্রিন্ট", "Print invoice": "ইনভয়েস প্রিন্ট",
  "Printer / invoice format": "প্রিন্টার / ইনভয়েস ফরম্যাট", "POS printer — 80mm": "পিওএস প্রিন্টার — ৮০ মিমি",
  "POS printer — 58mm": "পিওএস প্রিন্টার — ৫৮ মিমি", "Regular printer — A4": "সাধারণ প্রিন্টার — এ৪",
  "Sales Invoice": "বিক্রয় ইনভয়েস", "Edit customer": "গ্রাহক সম্পাদনা", "New customer": "নতুন গ্রাহক",
  "Proprietor / contact": "মালিক / যোগাযোগ", NID: "এনআইডি", BIN: "বিআইএন", "Plant / company": "প্রতিষ্ঠান / কোম্পানি", Industry: "শিল্প",
  "Products created automatically from sales and direct returns": "বিক্রয় ও সরাসরি ফেরত থেকে পণ্য স্বয়ংক্রিয়ভাবে তৈরি হয়",
  "Product name": "পণ্যের নাম", "Sale uses": "বিক্রয়ে ব্যবহার", "Return uses": "ফেরতে ব্যবহার", "Edit Product": "পণ্য সম্পাদনা",
  "Save Changes": "পরিবর্তন সংরক্ষণ", "Receive payment": "পেমেন্ট গ্রহণ", "Receive customer payment": "গ্রাহক পেমেন্ট গ্রহণ",
  "Payments reduce the customer's overall balance": "পেমেন্ট গ্রাহকের মোট ব্যালেন্স কমায়", Receipt: "রসিদ", Reference: "রেফারেন্স", Amount: "পরিমাণ",
  "Payment received": "পেমেন্ট গৃহীত হয়েছে", "Payment updated": "পেমেন্ট আপডেট হয়েছে", "Product returns": "পণ্য ফেরত",
  "Invoice returns and standalone cash refunds": "ইনভয়েস ফেরত ও স্বতন্ত্র নগদ রিফান্ড", Return: "ফেরত", Reason: "কারণ", Type: "ধরন",
  "From date": "শুরুর তারিখ", "To date": "শেষ তারিখ", Search: "খুঁজুন", "Export CSV": "সিএসভি এক্সপোর্ট", "Print report": "রিপোর্ট প্রিন্ট",
  "Gross sales": "মোট বিক্রয়", "Product-wise sales": "পণ্যভিত্তিক বিক্রয়", Quantity: "পরিমাণ", Gross: "মোট", Net: "নিট",
  "Customers with an outstanding balance": "বকেয়া ব্যালেন্সসহ গ্রাহক", "Minimum due": "সর্বনিম্ন বকেয়া", "Maximum due (0 = any)": "সর্বোচ্চ বকেয়া (০ = যেকোনো)",
  "Filtered customer due": "ফিল্টার করা গ্রাহক বকেয়া", "Complete customer collection history": "গ্রাহক আদায়ের সম্পূর্ণ ইতিহাস",
  "Filtered active collections": "ফিল্টার করা সক্রিয় আদায়", "Business name": "ব্যবসার নাম", "Currency symbol": "মুদ্রা চিহ্ন",
  "Invoice footer": "ইনভয়েস ফুটার", "Default invoice format": "ডিফল্ট ইনভয়েস ফরম্যাট", "Thermal width": "থার্মাল প্রস্থ",
  Thermal: "থার্মাল", Language: "ভাষা", English: "ইংরেজি", Bangla: "বাংলা", "Save settings": "সেটিংস সংরক্ষণ",
  "Change language": "ভাষা পরিবর্তন", "Numbers and dates": "সংখ্যা ও তারিখ", "English digits": "ইংরেজি সংখ্যা", "Bangla digits": "বাংলা সংখ্যা",
  "Invoice language": "ইনভয়েসের ভাষা", "English + Bangla": "ইংরেজি + বাংলা",
  "Invoice identity and print preferences": "ইনভয়েস পরিচয় ও প্রিন্ট পছন্দ", "Nothing here yet.": "এখনও কিছু নেই।", Loading: "লোড হচ্ছে",
  "Sign in": "সাইন ইন", Password: "পাসওয়ার্ড", "Search receipt, customer, reference": "রসিদ, গ্রাহক বা রেফারেন্স খুঁজুন",
};

const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function digits(value: string, system?: string) {
  return system === "bn" ? value.replace(/\d/g, (digit) => bnDigits[Number(digit)]) : value;
}

function message(value: string, language?: string, numeralSystem?: string) {
  if (language !== "bn") return digits(value, numeralSystem);
  const phrases: Record<string, string> = {
    "Unauthenticated": "আপনি লগইন করেননি", "Request failed": "অনুরোধ সম্পন্ন হয়নি", "Customer not found": "গ্রাহক পাওয়া যায়নি",
    "Select an active area": "একটি সক্রিয় এলাকা নির্বাচন করুন", "Select an active village in the selected area": "নির্বাচিত এলাকার একটি সক্রিয় গ্রাম নির্বাচন করুন",
    "This customer has sales and cannot be deleted.": "এই গ্রাহকের বিক্রয় আছে, তাই মুছে ফেলা যাবে না।",
    "This customer has payments and cannot be deleted.": "এই গ্রাহকের পেমেন্ট আছে, তাই মুছে ফেলা যাবে না।",
    "This customer has returns and cannot be deleted.": "এই গ্রাহকের ফেরত আছে, তাই মুছে ফেলা যাবে না।",
    "Operation failed": "কাজটি সম্পন্ন হয়নি", "Customer saved": "গ্রাহক সংরক্ষিত হয়েছে", "Sale deleted": "বিক্রয় মুছে ফেলা হয়েছে",
    "Delete this sale permanently? This will also remove its returns and customer ledger effects.": "এই বিক্রয়টি স্থায়ীভাবে মুছবেন? এর ফেরত ও গ্রাহক লেজারের প্রভাবও মুছে যাবে।",
  };
  let result = phrases[value] || value;
  result = result.replace(/^Delete customer "(.+)"\?$/, 'গ্রাহক "$1" মুছবেন?');
  result = result.replace(/^Delete area "(.+)"\?$/, 'এলাকা "$1" মুছবেন?');
  result = result.replace(/^Delete village "(.+)"\?$/, 'গ্রাম "$1" মুছবেন?');
  return digits(result, numeralSystem);
}

function bangla(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const translated = bn[trimmed];
  if (!translated) return value;
  return value.replace(trimmed, translated);
}

export default function LanguageTranslator({ language, numeralSystem }: { language?: string; numeralSystem?: string }) {
  useEffect(() => {
    const translate = (root: Node) => {
      const owner = root.nodeType === Node.ELEMENT_NODE ? root as Element : root.parentElement;
      if (owner?.closest("[data-no-translate]")) return;
      if (root.nodeType === Node.TEXT_NODE && root.textContent) {
        const saved = originalText.get(root);
        if (!saved || (root.textContent !== saved && root.textContent !== bangla(saved))) originalText.set(root, root.textContent);
        const target = digits(language === "bn" ? bangla(originalText.get(root)!) : originalText.get(root)!, numeralSystem);
        if (root.textContent !== target) root.textContent = target;
        return;
      }
      if (!(root instanceof Element)) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) if (node.textContent) {
        const saved = originalText.get(node);
        if (!saved || (node.textContent !== saved && node.textContent !== bangla(saved))) originalText.set(node, node.textContent);
        const target = digits(language === "bn" ? bangla(originalText.get(node)!) : originalText.get(node)!, numeralSystem);
        if (node.textContent !== target) node.textContent = target;
      }
      for (const element of [root, ...root.querySelectorAll("[placeholder],[title],[aria-label]")]) {
        for (const attribute of ["placeholder", "title", "aria-label"]) {
          const value = element.getAttribute(attribute);
          if (!value) continue;
          let saved = originalAttributes.get(element);
          if (!saved) { saved = new Map(); originalAttributes.set(element, saved); }
          const original = saved.get(attribute);
          if (!original || (value !== original && value !== bangla(original))) saved.set(attribute, value);
          element.setAttribute(attribute, digits(language === "bn" ? bangla(saved.get(attribute)!) : saved.get(attribute)!, numeralSystem));
        }
      }
    };
    document.documentElement.lang = language === "bn" ? "bn" : "en";
    if (language) localStorage.setItem("lite-pos-language", language);
    const nativeAlert = window.alert;
    const nativeConfirm = window.confirm;
    window.alert = (value?: unknown) => nativeAlert(message(String(value ?? ""), language, numeralSystem));
    window.confirm = (value?: string) => nativeConfirm(message(String(value ?? ""), language, numeralSystem));
    translate(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translate(mutation.target);
        else mutation.addedNodes.forEach(translate);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
    };
  }, [language, numeralSystem]);
  return null;
}
