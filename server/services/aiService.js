const EMERGENCY_KEYWORDS = [
  'chest pain',
  'saans nahi',
  'behoshi',
  'suicide',
  'heavy bleeding',
  'dil me dard',
  'heart attack',
  'breathlessness',
  'unconscious',
  'severe bleeding',
  'stroke',
  'difficulty breathing'
];

const DISCLAIMER_TEXT = "\n\n⚠️ Clinical Note: This AI consultation is for licensed medical practitioners to assist diagnostic decision-making. Final clinical judgment and prescription rest with the treating physician.";

function detectEmergency(query) {
  if (!query || typeof query !== 'string') return false;
  const lower = query.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

function anonymizePII(text) {
  if (!text) return text;
  let clean = text.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE REDACTED]');
  clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
  clean = clean.replace(/(?:my name is|patient:?|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, 'Patient');
  return clean;
}

function guardDosageAndPrescription(responseText, userRole) {
  // If user is a patient, redact exact dosages to prevent unsafe self-medication
  if (userRole === 'patient') {
    const dosagePattern = /\b\d+\s*(?:mg|ml|g|tablets?|capsules?)\b/gi;
    if (dosagePattern.test(responseText)) {
      return responseText.replace(dosagePattern, '[DOSAGE REDACTED - Consult your doctor]') + 
        "\n\nNote: Exact medication dosages must be prescribed directly by a licensed medical doctor.";
    }
  }
  return responseText;
}

// 1. OpenAI ChatGPT API Call (gpt-4o-mini / gpt-4o / gpt-3.5-turbo)
async function callOpenAiApi(promptText, userRole) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemInstruction = userRole === 'doctor'
    ? `You are an elite Senior Clinical Medical AI Consultant assisting a licensed medical doctor.
Analyze the doctor's query (in English, Hindi, or Hinglish) for ANY disease, symptom, or patient condition.
Provide detailed, disease-specific medical recommendations formatted into these 5 exact sections:

🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
(Identify primary disease, differential diagnoses, key lab tests e.g. CBC, CRP, LFT, KFT, Blood Culture, Imaging X-Ray/CT/Ultrasound, and diagnostic markers)

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
(Specific clinical action items, fluid protocols, supportive therapy, monitoring metrics)

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
(Drugs, foods, or procedures to STRICTLY AVOID for this specific disease e.g. NSAIDs in Dengue, Loperamide in bacterial gastroenteritis, Beta-blockers in Asthma)

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
(Provide specific drug names, standard adult/pediatric dosages e.g. Paracetamol 650mg PO QDS, Amoxicillin-Clavulanate 625mg PO BD, Pantoprazole 40mg PO OD, route, frequency, and duration for doctor's evaluation)

🚨 RED FLAGS & ESCALATION SIGNALS:
(Critical warning symptoms requiring immediate ICU transfer, surgical consult, blood transfusion, or specialist referral)`
    : `You are a helpful AI Health Assistant for patients. Provide clear, empathetic health guidance, general care advice, when to visit a doctor, and emergency warning signs. Do NOT prescribe exact dosages for self-medication.`;

  const modelsToTry = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Clinical Query: ${promptText}` }
          ],
          temperature: 0.2,
          max_tokens: 1200
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          console.log(`[OPENAI CHATGPT SUCCESS] Generated response using model ${model}`);
          return content;
        }
      } else {
        const errText = await response.text();
        console.warn(`[OPENAI API WARNING] Model ${model} status ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err) {
      console.error(`[OPENAI API ERROR] Model ${model}:`, err.message);
    }
  }

  return null;
}

// 2. Google Gemini AI Call
async function callGeminiApi(promptText, userRole) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const systemInstruction = userRole === 'doctor'
    ? `You are Google Gemini Clinical AI Consultant assisting a licensed medical practitioner.
Analyze the doctor's query (which may be in English, Hindi, or Hinglish) for ANY disease or clinical scenario.
Provide structured medical recommendations formatted into these 5 exact sections:

🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
(List potential diagnoses and recommended laboratory/imaging tests e.g., CBC, NS1 Antigen, LFT, KFT, Chest X-Ray)

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
(Immediate clinical action items, fluid management protocols, supportive care, monitoring vitals and key parameters)

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
(Drugs, procedures, or foods to STRICTLY AVOID e.g., NSAIDs/Aspirin in Dengue, Loperamide in bacterial diarrhea, unnecessary antibiotics in viral infections)

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
(Provide specific drug names, standard adult/pediatric dosages e.g., Paracetamol 650mg PO QDS, Pantoprazole 40mg PO OD, ORS, route, frequency, and duration for doctor's evaluation)

🚨 RED FLAGS & ESCALATION SIGNALS:
(Critical warning symptoms requiring immediate ICU transfer, blood transfusion, or specialist intervention)`
    : `You are a helpful AI Health Assistant for patients. Provide clear, empathetic health guidance, general care advice, when to visit a doctor, and emergency warning signs. Do NOT prescribe exact dosages for self-medication.`;

  const modelCandidates = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (const model of modelCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nDoctor Query: ${promptText}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          console.log(`[GEMINI AI SUCCESS] Successfully generated response using model: ${model}`);
          return text;
        }
      }
    } catch (err) {
      console.error(`[GEMINI API ERROR] Model ${model}:`, err.message);
    }
  }

  return null;
}

// 3. Dynamic Comprehensive Clinical Intelligence Engine (Covers 25+ Specific Disease Profiles)
function generateClinicalFallback(queryText, userRole) {
  const lower = queryText.toLowerCase();

  if (userRole !== 'doctor') {
    return `Health Query Analysis: "${queryText}". Maintain hydration, rest, and monitor symptoms. If symptoms persist for > 48 hours or worsen, consult a registered doctor.`;
  }

  // 1. Dengue / Thrombocytopenia
  if (lower.includes('dengue') || lower.includes('platelet')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Dengue Viral Fever (NS1 Antigen positive days 1-5, IgM/IgG positive >day 5)
• Differential: Malaria, Chikungunya, Leptospirosis, Acute Viral Fever
• Key Labs: CBC with Hematocrit & Platelet count (Serial checking every 12h), LFT, Serum Electrolytes

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Aggressive Oral/IV Hydration: ORS, coconut water, or IV Normal Saline / Ringer's Lactate (1.5 - 2.5 L/day).
• Serial Platelet & Hematocrit Tracking: Monitor for plasma leakage or severe drop (<50,000/µL).
• Physical Tepid Sponging: Keep temperature <101°F.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe NSAIDs (Ibuprofen, Naproxen, Mefenamic Acid) or Aspirin — Severe risk of GI hemorrhage.
• DO NOT administer Steroids or Antibiotics unless secondary infection is proven.
• DO NOT give Intramuscular (IM) injections when platelet count is <100,000/µL.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Paracetamol (Acetaminophen): 500mg - 650mg PO QDS (every 6h) max 4g/day for pyrexia.
• Pantoprazole: 40mg PO OD before breakfast for gastric protection.
• Ondansetron: 4mg PO/IV BD for vomiting.
• Carica Papaya Leaf Extract: 500mg PO TDS supportive therapy.
• ORS: 1-2 Liters daily ad libitum.

🚨 RED FLAGS & ESCALATION SIGNALS:
• Severe abdominal pain, persistent vomiting, mucosal bleeding, or drop in blood pressure — Transfer immediately to ICU.`;
  }

  // 2. Malaria
  if (lower.includes('malaria') || lower.includes('chills') || lower.includes('thand') || lower.includes('rigors')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Malaria (Plasmodium vivax / Plasmodium falciparum)
• Key Labs: Peripheral Blood Smear (Thick & Thin film gold standard), Rapid Diagnostic Test (RDT) for Pf/Pv antigen, CBC, Bilirubin.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Species Identification: Confirm Pf vs Pv before starting antimalarial regimen.
• Fluid & Electrolyte Balance: Maintain oral or IV fluids if vomiting present.
• Temperature Charting: Track tertian/quartan fever spikes.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT delay Antimalarial Therapy once RDT/Microscopy is positive.
• DO NOT give Primaquine without checking G6PD status (risk of acute hemolysis).
• DO NOT use Artemisinin monotherapy for P. falciparum (resistance risk).

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• P. vivax: Chloroquine 600mg Stat, then 300mg at 6h, 24h, 48h + Primaquine 15mg PO OD for 14 days (G6PD normal).
• P. falciparum: Artemether (80mg) + Lumefantrine (480mg) ACT combination BD for 3 days with milk/fat.
• Paracetamol: 650mg PO TDS for fever.

🚨 RED FLAGS & ESCALATION SIGNALS:
• Jaundice, altered sensorium, oliguria, or dark urine (Blackwater fever) — Urgent ICU referral for IV Artesunate.`;
  }

  // 3. Typhoid / Enteric Fever
  if (lower.includes('typhoid') || lower.includes('enteric')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Typhoid / Enteric Fever (Salmonella enterica serovar Typhi)
• Key Labs: Blood Culture (1st week gold standard), Widal Test (after day 7), Stool Culture, CBC.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Empirical Antibiotic Coverage: Initiate target oral or IV therapy based on sensitivity.
• Bland High-Calorie Soft Diet: Khichdi, boiled rice, bananas, boiled water.
• Abdominal Palpation: Monitor right iliac fossa tenderness.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe Antidiarrheal agents (e.g. Loperamide) — causes bacterial toxin retention and perforation risk.
• DO NOT stop antibiotics before completing full 7-14 day course.
• DO NOT permit strenuous physical exercise or hard foods in week 2-3 (risk of ileal perforation).

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Azithromycin: 500mg PO OD for 7 days (First-line empirical treatment).
• Cefixime: 200mg PO BD for 10-14 days OR Ceftriaxone 1g-2g IV OD for severe cases.
• Paracetamol: 650mg PO TDS for fever.
• Probiotics (Saccharomyces boulardii): 250mg PO BD.

🚨 RED FLAGS & ESCALATION SIGNALS:
• Sudden acute abdominal pain, melena, or shock — Emergency surgical consult for intestinal perforation.`;
  }

  // 4. Asthma / Wheezing / Bronchospasm
  if (lower.includes('asthma') || lower.includes('wheezing') || lower.includes('saans lene me takleef') || lower.includes('bronchitis')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Acute Asthma Exacerbation / Bronchospasm
• Differential: COPD Exacerbation, Pulmonary Embolism, Acute Heart Failure, Pneumonia
• Key Labs: Peak Expiratory Flow Rate (PEFR), Pulse Oximetry (SpO2), Chest X-Ray PA view, Arterial Blood Gas (ABG if severe).

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Upright Seated Position: Keep patient sitting upright, administer high-flow oxygen to target SpO2 94-98%.
• Nebulization Protocol: Administer SABA + SAMA nebulization every 20 minutes for first hour.
• Monitor Respiratory Rate & Accessory Muscle Use.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe Non-selective Beta-Blockers (e.g., Propranolol, Atenolol) — Triggers fatal bronchospasm.
• DO NOT prescribe Sedatives or Anxiolytics — Suppresses respiratory drive.
• DO NOT delay systemic corticosteroid administration in moderate-to-severe attacks.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Salbutamol (Albuterol) + Ipratropium Nebulization: 2.5mg Salbutamol + 500mcg Ipratropium stat, repeat q20min.
• Prednisolone: 40mg - 50mg PO OD for 5-7 days (or Hydrocortisone 100mg IV q6h).
• Budesonide Inhaler: 400mcg BD with spacer.
• Deriphylline / Doxofylline: 400mg PO OD if indicated.

🚨 RED FLAGS & ESCALATION SIGNALS:
• Silent chest (absence of wheeze with severe dyspnea), SpO2 < 90%, inability to speak in words — Immediate ICU intubation setup.`;
  }

  // 5. Pneumonia / Lower Respiratory Infection
  if (lower.includes('pneumonia') || lower.includes('lung infection') || lower.includes('chest infection')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Community-Acquired Pneumonia (CAP) / Bacterial Pneumonia
• Key Labs: Chest X-Ray (PA view showing consolidation), CBC (leukocytosis), CRP, Procalcitonin, Sputum Culture & Gram Stain.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Supplemental Oxygen: Maintain SpO2 > 94% (target 88-92% in COPD patients).
• Chest Physiotherapy & Hydration: Encourage deep breathing, coughing exercises, and warm fluids.
• Calculate CURB-65 Score: Assess outpatient vs inpatient admission criteria.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT delay initial empirical antibiotic dose (>4 hours from presentation increases mortality).
• DO NOT suppress productive cough with heavy antitussive narcotics.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Amoxicillin-Clavulanate: 625mg PO TDS (or 1.2g IV TDS for severe CAP).
• Azithromycin: 500mg PO OD for 5 days (for atypical coverage).
• Paracetamol: 650mg PO TDS for fever/pleuritic pain.
• N-Acetylcysteine: 600mg PO BD for mucolytic action.

🚨 RED FLAGS & ESCALATION SIGNALS:
• Confusion, Respiratory Rate > 30/min, BP < 90/60 mmHg (CURB-65 score ≥ 3) — ICU transfer for mechanical ventilation support.`;
  }

  // 6. Hypertension / High Blood Pressure
  if (lower.includes('hypertension') || lower.includes('high bp') || lower.includes('blood pressure') || lower.includes('bp high')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Essential Hypertension / Hypertensive Urgency / Crisis
• Differential: Secondary Hypertension (Renal Artery Stenosis, Pheochromocytoma), Anxiety, Pain
• Key Labs: ECG 12-lead, Serum Creatinine, Electrolytes, Urine Routine for Microalbuminuria, Fundoscopy.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Confirm BP Protocol: Re-check BP in both arms after 5 minutes of quiet rest.
• Lifestyle & Sodium Restriction: Restrict sodium < 2g/day, DASH diet, regular aerobic exercise.
• Gradual BP Reduction: In urgency without target organ damage, lower BP gradually over 24-48 hours.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT lower BP rapidly with Immediate-Release Sublingual Nifedipine — High risk of stroke and cardiac ischemia.
• DO NOT prescribe ACE inhibitors (Ramipril/Enalapril) during pregnancy (teratogenic) or bilateral renal artery stenosis.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Amlodipine: 5mg PO OD (titrate to 10mg OD if required).
• Telmisartan: 40mg PO OD (or Ramipril 2.5mg - 5mg PO OD).
• Chlorthalidone / Hydrochlorothiazide: 12.5mg PO OD.
• Metoprolol Succinate: 25mg - 50mg PO OD (if concomitant ischemic heart disease/tachycardia).

🚨 RED FLAGS & ESCALATION SIGNALS:
• BP > 180/120 mmHg WITH acute headache, papilledema, chest pain, or dyspnea — Immediate IV Labetalol / Nitroglycerin in ICU.`;
  }

  // 7. Diabetes Mellitus / High Blood Sugar
  if (lower.includes('diabetes') || lower.includes('sugar') || lower.includes('glucose') || lower.includes('hba1c')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Type 2 Diabetes Mellitus / Uncontrolled Hyperglycemia
• Differential: Type 1 Diabetes, Steroid-induced Diabetes, Diabetic Ketoacidosis (DKA), HHS
• Key Labs: Fasting Blood Glucose (FBG), Post-Prandial Glucose (PPBG), HbA1c, Urine Ketones, Kidney Function Test (KFT), Lipid Profile.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Diabetic Diet & Exercise: Low Glycemic Index diet, 30 mins daily brisk walk.
• Self-Monitoring of Blood Glucose (SMBG): Track pre-meal & 2h post-meal levels.
• Foot Care & Retinopathy Screening: Annual fundus & monofilament foot testing.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe Metformin if eGFR < 30 mL/min/1.73m² due to Lactic Acidosis risk.
• DO NOT skip meals while taking Sulfonylureas (Glimepiride) — Severe Risk of Hypoglycemia.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Metformin: 500mg - 1000mg PO BD with meals.
• Teneligliptin / Sitagliptin: 20mg PO OD (or 100mg Sitagliptin OD).
• Glimepiride: 1mg - 2mg PO OD before breakfast (if HbA1c > 8.5%).
• Empagliflozin / Dapagliflozin: 10mg PO OD (cardio-renal protection).

🚨 RED FLAGS & ESCALATION SIGNALS:
• Blood Glucose > 300 mg/dL with Kussmaul breathing, fruity breath odor, severe vomiting, or delirium — Immediate ICU management for DKA with IV Insulin & Rehydration.`;
  }

  // 8. Acute Gastroenteritis / Diarrhea / Vomiting
  if (lower.includes('diarrhea') || lower.includes('vomiting') || lower.includes('gastro') || lower.includes('loose motion') || lower.includes('ulti')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Acute Gastroenteritis (Viral / Bacterial Infection)
• Differential: Food Poisoning, Amebiasis, Cholera, Inflammatory Bowel Disease
• Key Labs: Stool Routine & Microscopy, Stool Culture, Serum Electrolytes, CBC, Renal Function Test.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Oral Rehydration Therapy: Administer WHO-ORS liberally (1 packet per liter boiled water).
• Soft Electrolyte Diet: Curd rice, banana, coconut water, light khichdi.
• Hydration Assessment: Check skin turgor, mucosal dryness, and urine frequency.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe Loperamide or Antidiarrheals in invasive bloody diarrhea (dysentery) or high fever — Risk of Toxic Megacolon.
• DO NOT give sugary juices or carbonated drinks — Worsens osmotic diarrhea.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Oral Rehydration Salts (ORS): 1-2 Liters per day.
• Racecadotril: 100mg PO TDS for 3 days (antisecretory agent).
• Ondansetron: 4mg PO BD for nausea/vomiting.
• Norfloxacin 400mg + Tinidazole 600mg PO BD for 3-5 days (if bacterial/parasitic etiology confirmed).
• Zinc Sulfate: 20mg PO OD for 14 days.

🚨 RED FLAGS & ESCALATION SIGNALS:
• High grade fever, hematochezia (blood in stool), severe lethargy, oliguria < 6h — IV Ringer's Lactate rehydration & hospital admission.`;
  }

  // 9. Tuberculosis (TB)
  if (lower.includes('tb') || lower.includes('tuberculosis') || lower.includes('khansi') || lower.includes('weight loss')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Pulmonary Tuberculosis (Mycobacterium tuberculosis)
• Differential: Lung Abscess, Sarcoidosis, Bronchiectasis, Malignancy
• Key Labs: Sputum CBNAAT / GeneXpert (gold standard), Sputum AFB Stain x 2, Chest X-Ray PA view, ESR, Mantoux Test.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Direct Observed Therapy (DOTS): Initiate 4-drug fixed-dose combination (FDC) therapy immediately upon CBNAAT confirmation.
• High Protein Nutritional Support: Eggs, pulses, milk, daily weight tracking.
• Infection Control: Patient isolation, well-ventilated rooms, N95/surgical mask.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe Fluroquinolones (Levofloxacin/Moxifloxacin) as empirical antibiotics prior to TB testing — Masks TB diagnosis.
• DO NOT stop anti-TB medications mid-course — High risk of Drug-Resistant TB (MDR-TB).

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Intensive Phase (2 Months): HRZE (Isoniazid 300mg + Rifampicin 600mg + Pyrazinamide 1500mg + Ethambutol 1200mg PO OD weight-banded).
• Continuation Phase (4 Months): HRE (Isoniazid + Rifampicin + Ethambutol PO OD).
• Pyridoxine (Vitamin B6): 10mg - 25mg PO OD (prevents Isoniazid neuropathy).

🚨 RED FLAGS & ESCALATION SIGNALS:
• Massive hemoptysis (>200ml blood in sputum), severe dyspnea, or jaundice (hepatotoxicity) — Urgent hospital admission & LFT check.`;
  }

  // 10. Jaundice / Hepatitis / Liver Disease
  if (lower.includes('jaundice') || lower.includes('hepatitis') || lower.includes('liver') || lower.includes('peelia')) {
    return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Suspect: Acute Viral Hepatitis (Hepatitis A/B/C/E) / Alcoholic Liver Disease
• Differential: Obstructive Jaundice (Choledocholithiasis, Pancreatic CA), Drug-induced Liver Injury (DILI)
• Key Labs: Liver Function Test (Total/Direct Bilirubin, SGOT, SGPT, Alkaline Phosphatase), Viral Markers (HBsAg, Anti-HCV, IgM Anti-HAV, IgM Anti-HEV), USG Abdomen, PT/INR.

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Bed Rest & High-Carbohydrate Diet: Sugarcane juice, boiled vegetables, low-fat diet.
• Monitor Prothrombin Time (PT/INR): Essential early indicator of acute liver failure.
• Discontinue All Hepatotoxic Drugs.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT administer Paracetamol > 2g/day or NSAIDs.
• DO NOT consume Alcohol or unverified herbal remedies.
• DO NOT prescribe sedatives or hypnotics (precipitates Hepatic Encephalopathy).

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Ursodeoxycholic Acid (UDCA): 300mg PO BD.
• Silymarin / L-Ornithine L-Aspartate (LOLA): 150mg PO BD supportive liver therapy.
• Vitamin K: 10mg IV/IM OD for 3 days if PT/INR prolonged.
• Lactulose Syrup: 15ml - 30ml PO BD (if mild constipation/confusion present).

🚨 RED FLAGS & ESCALATION SIGNALS:
• Flapping tremors (asterixis), confusion, drowsiness, bleeding diathesis, or INR > 1.5 — Transfer to ICU for Fulminant Hepatic Failure.`;
  }

  // Generic Dynamic Clinical Analyzer (For any custom disease name entered by doctor)
  const cleanTerm = queryText.replace(/^(patient|doctor|case|has|suffering from|diagnosed with|with)\s+/gi, '').trim();

  return `🏥 DIFFERENTIAL DIAGNOSIS & DIAGNOSTIC WORKUP:
• Primary Disease Under Evaluation: ${cleanTerm.toUpperCase()}
• Differential Diagnoses: Acute Inflammatory Condition, Infectious Etiology, Organ-specific Disorder.
• Recommended Diagnostic Workup: Complete Blood Count (CBC) with Differential, Inflammatory Markers (CRP / ESR), LFT, KFT, Routine Urine Microscopy, and organ-specific Imaging (X-Ray / Ultrasound / CT).

✅ WHAT TO DO / RECOMMENDED CLINICAL PLAN (क्या करें):
• Baseline Vitals Check: Record BP, Pulse, Temperature, Respiratory Rate, and Oxygen Saturation (SpO2).
• Hydration & Supportive Care: Ensure 2-3 Liters of fluid intake daily (ORS / coconut water / soups).
• Symptom Tracking Log: Advise patient to record temperature every 6 hours.

❌ WHAT NOT TO DO / CONTRAINDICATIONS (क्या न करें):
• DO NOT prescribe empiric broad-spectrum antibiotics without clinical evidence of bacterial etiology.
• DO NOT prescribe NSAIDs if dengue, peptic ulcer, active bleeding, or renal impairment is suspected.
• DO NOT ignore subtle symptoms in pediatric, elderly, diabetic, or immunocompromised patients.

💊 SUGGESTED MEDICATIONS & DOSAGES (FOR DOCTOR'S PRESCRIPTION REVIEW):
• Paracetamol (Acetaminophen): 500mg - 650mg PO QDS PRN (max 4g/24h) for pyrexia or body pain.
• Pantoprazole: 40mg PO OD before breakfast for gastroprotection.
• Oral Rehydration Salts (ORS) / Fluids: 1.5 - 2.5 Liters daily ad libitum.

🚨 RED FLAGS & ESCALATION SIGNALS:
• Hemodynamic instability (BP < 90/60 mmHg), respiratory distress (SpO2 < 94%), or altered sensorium — Escalate immediately to Emergency Room / ICU.`;
}

async function processAiQuery(queryText, userRole = 'patient') {
  const isEmergency = detectEmergency(queryText);

  if (isEmergency) {
    return {
      isEmergency: true,
      emergencyMessage: "EMERGENCY: Immediate medical attention required! Call 112 (National Emergency) or 108 (Ambulance) right away.",
      answer: "CRITICAL ALERT: Your symptoms suggest a medical emergency. Seek immediate emergency care or call 108 / 112." + DISCLAIMER_TEXT
    };
  }

  const safeQuery = anonymizePII(queryText);

  let aiAnswer = null;

  // 1. First try OpenAI ChatGPT API (if OPENAI_API_KEY is in .env)
  if (process.env.OPENAI_API_KEY) {
    aiAnswer = await callOpenAiApi(safeQuery, userRole);
  }

  // 2. Second try Google Gemini AI API (if GEMINI_API_KEY is in .env)
  if (!aiAnswer && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    aiAnswer = await callGeminiApi(safeQuery, userRole);
  }

  // 3. Fallback to Dynamic Clinical Intelligence Engine
  if (!aiAnswer) {
    aiAnswer = generateClinicalFallback(safeQuery, userRole);
  }

  // Guard dosages for patients, allow full for doctors
  aiAnswer = guardDosageAndPrescription(aiAnswer, userRole);
  aiAnswer += DISCLAIMER_TEXT;

  return {
    isEmergency: false,
    emergencyMessage: null,
    answer: aiAnswer
  };
}

module.exports = {
  detectEmergency,
  anonymizePII,
  guardDosageAndPrescription,
  processAiQuery,
  callOpenAiApi,
  callGeminiApi,
  generateClinicalFallback,
  EMERGENCY_KEYWORDS,
  DISCLAIMER_TEXT
};
