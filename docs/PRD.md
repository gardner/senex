# Product Requirements Document: Browser-Based Cognitive Monitoring

**Working title:** Cognitive Monitor
**Status:** Draft PRD
**Primary users:** Adults who want to monitor cognition, reaction speed, memory, attention, and related performance over time
**Secondary users:** Researchers, clinicians/research coordinators, trial recruiters, caregivers/support people where explicitly authorised by the user
**Product framing:** Longitudinal cognitive-performance monitoring, not diagnosis

---

## 1. Executive summary

We are building a browser-based cognitive monitoring product that lets users complete short repeatable tests daily, weekly, and monthly. The product tracks personal trends across reaction speed, attention, processing speed, memory, working memory, executive function, spatial memory, and related self-reported context.

The product must support three privacy and identity modes:

1. **Offline Mode**
   No login. No server account. Data is stored locally in the browser. The user can export or import their history as JSON.

2. **Anonymous Reporting Mode**
   No traditional account. The user is represented by an anonymous longitudinal ID and can choose to share test data, demographics, and research-relevant questionnaires.

3. **Signed-In Mode**
   Full account. The user can manage history across sessions/devices, answer research questions, manage consent, and indicate that they are open to being contacted about trials.

The product’s core promise is:

> “Track your cognitive performance over time, understand your normal range, and notice sustained changes worth paying attention to.”

The product must avoid implying that it diagnoses dementia, mild cognitive impairment, Alzheimer’s disease, ADHD, concussion, depression, or any other condition unless and until validated and reviewed under the appropriate clinical, ethical, and regulatory pathways. In New Zealand, privacy obligations apply to collection, storage, use, disclosure, access, and correction of personal information, and health/disability research may require ethics review depending on study design and use. ([Privacy Commissioner][1])

---

## 2. Problem statement

People may notice changes in memory, attention, reaction speed, word-finding, or mental sharpness, but most tools are either:

- Too clinical for everyday use
- Too casual to produce meaningful longitudinal data
- Too cloud/account-dependent for privacy-conscious users
- Too focused on one-off scores rather than personal trends
- Too vague about data sharing and research use

Researchers also need better ways to collect repeatable, real-world longitudinal cognitive data with consented demographics and context.

We need a product that supports both **private self-tracking** and **opt-in research contribution**, without forcing every user into the same identity or data-sharing model.

---

## 3. Product goals

### 3.1 User goals

Users should be able to:

- Complete short cognitive and reaction tests repeatedly
- See personal trends over time
- Understand whether a result is within their usual range
- Record context that may explain performance changes
- Use the product privately without creating an account
- Export, import, or delete their own data
- Choose whether to contribute data to research
- Upgrade from offline use to anonymous reporting or signed-in mode
- Withdraw or change consent where applicable
- Avoid fear-inducing or diagnostic language

### 3.2 Research goals

Researchers should be able to receive consented, structured, longitudinal data that includes:

- Repeated cognitive task results
- Trial-level or session-level performance metrics
- Demographics
- Self-reported health/context questionnaires
- Consent history
- Participation preferences
- Optional trial-contact eligibility data for signed-in users

### 3.3 Business/product goals

The product should:

- Build trust through privacy-first design
- Support viral/low-friction use through offline mode
- Create a pathway from private self-tracking to research contribution
- Build a high-quality longitudinal dataset with informed consent
- Enable future partnerships with researchers, universities, clinics, or trial sponsors
- Remain product-focused until clinical validation supports stronger claims

---

## 4. Non-goals for v1

The first version should **not**:

- Diagnose cognitive impairment or dementia
- Provide individual medical recommendations
- Claim Alzheimer’s risk prediction
- Replace professional cognitive assessment
- Provide “brain age” as a headline score
- Allow researchers to directly identify anonymous reporting users
- Allow trial recruitment without explicit signed-in consent
- Force account creation
- Require internet access for basic self-tracking
- Share offline-mode data automatically
- Present one bad day as meaningful decline

---

## 5. Product principles

### 5.1 Privacy by default

The default experience should make it possible to use the product without an account and without sharing data.

### 5.2 Consent must be specific and reversible

Users should understand what they are sharing, why, with whom, and whether they can stop future sharing.

### 5.3 Longitudinal trends matter more than single scores

The product should emphasise patterns over time, not isolated test results.

### 5.4 Practice effects are part of the measurement problem

Repeated testing can improve performance through familiarity. The product should explain and model this rather than pretending it does not exist.

### 5.5 Avoid frightening language

The product should use neutral wording such as “outside your usual range” or “worth discussing with a health professional” rather than “decline detected” in early versions.

### 5.6 Users own their data experience

Every mode should support data visibility, export, deletion, and clear control over sharing.

### 5.7 Accessibility is core

Tests must be usable by older adults, people with mild visual or motor limitations, and users with varying technical confidence.

---

## 6. Modes overview

| Mode                         | Identity                  | Storage expectation             | Sharing                                                | Best for                                                                   |
| ---------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Offline Mode**             | No login                  | Local browser storage           | None unless user manually exports                      | Privacy-first users, demos, personal tracking                              |
| **Anonymous Reporting Mode** | Anonymous longitudinal ID | Local plus reporting submission | User-consented anonymous/pseudonymous research dataset | Users who want to contribute to research without an account                |
| **Signed-In Mode**           | Account identity          | User account history            | User-controlled research/trial sharing                 | Users who want continuity, richer history, and trial participation options |

Important product wording: Anonymous Reporting Mode should be described carefully. A long-term anonymous ID plus demographic and health answers may be **pseudonymous** rather than truly impossible to re-identify. The product should avoid promising impossible anonymity.

Recommended wording:

> “Your data is linked to a random study ID, not your name or email. Some combinations of answers may still be identifying, so we treat this as sensitive research data.”

---

# 7. Mode 1: Offline Mode

## 7.1 Summary

Offline Mode allows users to use the product without login, without network dependency, and without automatic sharing.

The product stores test history in the user’s browser. The user can export their data as a JSON file and later import that file to restore history.

## 7.2 User value

Offline Mode gives users:

- Immediate access
- Maximum privacy
- No account friction
- Full control over backup and restore
- A safe way to try the product before sharing anything

## 7.3 Entry points

Users can enter Offline Mode from:

- First-run onboarding
- A “Continue privately” option
- A “Use without account” button
- Returning browser sessions where local data exists

## 7.4 First-run offline experience

The user should see:

1. Plain explanation of Offline Mode
2. What is stored locally
3. What is not shared
4. Reminder that clearing browser data may erase history
5. Option to begin baseline setup

Suggested copy:

> “Use privately on this device. Your test history is saved in this browser and is not uploaded. You can export a backup file any time.”

## 7.5 Offline features

P0 requirements:

- User can complete all core tests
- User can view daily, weekly, and monthly trends
- User can see their personal baseline
- User can manually export data as JSON
- User can import a previously exported JSON file
- User can delete local data
- User can see when data was last saved locally
- User can use the product without creating an account
- User can later upgrade to Anonymous Reporting Mode or Signed-In Mode

P1 requirements:

- User can set a local display name or nickname
- User can add notes to sessions
- User can export a human-readable summary report
- User can choose what to include in exports
- User can receive reminders if browser permissions allow it

P2 requirements:

- User can encrypt exported backup files with a passphrase
- User can manage multiple local profiles on the same device
- User can create local-only caregiver/observer notes

## 7.6 Offline limitations to communicate

The product should clearly state:

- Local data may be lost if the user clears browser storage
- Data may not automatically transfer between devices
- The product cannot recover lost offline-only data
- Offline data is not contributing to research unless the user later chooses to share it

## 7.7 Offline JSON export/import requirements

The JSON export should be treated as a user-owned backup.

The export should include:

- User’s local profile metadata
- Test sessions
- Trial summaries or full trial data, depending on export option
- Baseline calculations
- User-entered notes
- Questionnaires completed locally
- Consent state, if applicable
- Product version/schema version
- Export timestamp

The import flow should:

- Validate the file
- Show a summary before import
- Warn before overwriting or merging
- Support “merge with existing history”
- Detect duplicate sessions
- Preserve original timestamps
- Produce a clear success/failure message

## 7.8 Offline acceptance criteria

Offline Mode is acceptable when:

- A new user can start testing without account creation
- A returning user can see previous local history
- A user can export a valid JSON backup
- A user can restore from a JSON backup
- A user can delete all local history
- No research data is submitted without explicit user action
- The product remains useful without internet access after initial loading

---

# 8. Mode 2: Anonymous Reporting Mode

## 8.1 Summary

Anonymous Reporting Mode allows users to contribute data to research without creating a traditional account. The user is assigned or creates a random longitudinal ID. Their test data, demographics, questionnaire answers, and context data can be submitted for research use according to explicit consent.

This mode is for users who are willing to contribute data but do not want to provide name, email, or account credentials.

## 8.2 User value

Anonymous Reporting Mode gives users:

- Research contribution without full signup
- Ongoing self-tracking
- A persistent anonymous study identity
- Control over what is shared
- Ability to stop future reporting

## 8.3 Research value

This mode provides:

- Larger participant pool
- Lower signup friction
- Longitudinal anonymous/pseudonymous cognitive data
- Demographic and contextual metadata
- Consent-linked dataset records

## 8.4 First-run reporting experience

The user should see:

1. What anonymous reporting means
2. What data may be shared
3. What is not collected, such as name or email
4. Limits of anonymity
5. Research-use consent
6. Option to answer demographics now or later
7. Anonymous ID recovery/backup warning

Suggested copy:

> “Contribute your test data using a random study ID. We will not ask for your name or email in this mode. Some combinations of answers may still be identifying, so your data will be handled as sensitive research data.”

## 8.5 Anonymous ID requirements

P0 requirements:

- User receives a random longitudinal ID
- User can view their anonymous ID
- User can copy/export their anonymous ID
- User can reset and start fresh
- User can stop future reporting
- User can continue using the product offline after stopping reporting

P1 requirements:

- User can restore anonymous reporting identity from backup JSON
- User can rotate their anonymous ID, with a warning that trend continuity may be affected
- User can review all currently active consents

## 8.6 Consent requirements

Anonymous Reporting Mode must separate consent into understandable choices.

P0 consent options:

- Share cognitive test results
- Share demographics
- Share questionnaire answers
- Share session context, such as sleep/stress/distraction
- Allow de-identified/pseudonymous data to be used in approved research
- Allow data to be retained for longitudinal research after submission
- Stop future sharing

P1 consent options:

- Share full trial-level data versus summary-only data
- Share data with named research partners
- Allow recontact only if the user later creates an account
- Receive public research updates without revealing identity, if feasible

The product should maintain a consent history, not just current state.

## 8.7 Demographics and research questions

All sensitive questions should include:

- “Prefer not to say”
- Plain-language purpose
- Whether the answer is required
- Whether the answer affects reports
- Whether the answer is shared with researchers

Recommended demographic fields:

- Age range or year of birth, depending on research need
- Country/region
- Primary language
- Other languages used regularly
- Education range
- Sex assigned at birth, optional
- Gender, optional
- Ethnicity, optional and region-appropriate
- Handedness
- Vision/hearing limitations
- Device familiarity
- Typical sleep quality
- Occupational status, optional
- General health rating

Recommended health/context questions:

- Prior cognitive diagnosis, self-reported
- Memory concerns
- Family history of dementia, optional
- Neurological history, optional
- Major psychiatric history, optional
- Current medications by broad category, optional
- Sleep conditions, optional
- Recent concussion/head injury, optional
- Alcohol/cannabis/sedative use context, optional and carefully worded
- Depression/anxiety/stress self-report, optional
- Daily functioning changes

Recommended session-level questions:

- Sleep quality last night
- Stress today
- Illness today
- Caffeine timing
- Alcohol or sedating substances in past 24 hours, where appropriate
- Distraction/interruption during test
- Unusual device/input method
- Subjective effort

## 8.8 Reporting dashboard

Users in Anonymous Reporting Mode should see:

- Their personal trend dashboard
- Their anonymous ID
- Sharing status
- Last successful report upload
- What categories of data are being shared
- Ability to pause reporting
- Ability to delete local data
- Ability to request deletion or exclusion of previously submitted data where feasible and applicable

## 8.9 Anonymous reporting acceptance criteria

Anonymous Reporting Mode is acceptable when:

- A user can opt into research sharing without name/email
- A user can understand what is being shared
- A user can complete demographics/questionnaires incrementally
- Submitted data is linked to consent state
- A user can stop future sharing
- A user can export their local and reporting identity data
- The interface does not promise absolute anonymity
- Trial contact is not possible unless the user moves to Signed-In Mode and explicitly opts in

---

# 9. Mode 3: Signed-In Mode

## 9.1 Summary

Signed-In Mode provides a full account experience. Users can manage their cognitive history, answer richer research questions, sync history, manage consent, and indicate that they are open to participating in trials.

## 9.2 User value

Signed-In Mode gives users:

- Persistent history
- Easier recovery
- Multi-session continuity
- More complete reporting
- Consent management
- Trial participation options
- Potential clinician/research export options

## 9.3 Research and trial value

Signed-In Mode enables:

- Higher-quality longitudinal data
- More complete consent records
- Eligibility pre-screening
- Trial contact consent
- Optional researcher/coordinator workflows
- User-managed participation preferences

## 9.4 First-run signed-in experience

The user should see:

1. Account creation/sign-in
2. Plain explanation of account benefits
3. Data-use choices
4. Research questionnaire setup
5. Trial participation opt-in
6. Profile/history import option

Suggested copy:

> “Create an account to keep your history, manage research sharing, and optionally let approved research teams contact you about future studies.”

## 9.5 Account features

P0 requirements:

- User can create an account
- User can sign in and sign out
- User can view test history
- User can manage profile information
- User can export their data
- User can delete their account or request deletion
- User can manage research consent
- User can opt into or out of trial contact
- User can import offline history
- User can migrate from Anonymous Reporting Mode

P1 requirements:

- User can add emergency/clinician contact only if explicitly desired
- User can generate a clinician-friendly report
- User can view research contribution history
- User can see which questionnaires are complete
- User can update demographic/research answers over time
- User can set reminders
- User can invite a caregiver/support person with restricted access

P2 requirements:

- User can share selected reports with a clinician
- User can participate in study-specific modules
- User can join research cohorts
- User can receive study updates or aggregate findings
- User can manage family/caregiver observer reports

## 9.6 Trial participation opt-in

The checkbox should be clear and separate from general research data sharing.

Recommended label:

> “I’m open to being contacted about relevant research studies or clinical trials.”

Supporting explanation:

> “This does not enrol you in a study. It only allows approved research teams or coordinators to contact you with information if you may be eligible.”

P0 trial-contact fields:

- Consent to be contacted
- Preferred contact method
- Country/region
- Age eligibility information
- Broad health eligibility questions
- Availability/preferences
- Date consent was given
- Date consent was last reviewed

P1 trial-contact fields:

- Travel willingness
- Remote-only preference
- Language preference
- Study-type preferences
- Care partner availability
- Diagnosis status, self-reported
- Current clinician involvement, optional

## 9.7 Signed-in reporting dashboard

The user should be able to see:

- Cognitive trend history
- Baseline status
- Test completion streaks
- Data quality notes
- Research sharing status
- Trial contact status
- Consent history
- Account export/delete controls
- Imported data history

## 9.8 Signed-in acceptance criteria

Signed-In Mode is acceptable when:

- A user can create and manage an account
- A user can view history across sessions
- A user can import offline/anonymous history
- A user can manage consent by category
- A user can opt into trial contact separately from data sharing
- A user can opt out of trial contact at any time
- A user can export and delete account data
- The product never treats trial-contact opt-in as study enrolment

---

# 10. Cross-mode migration

## 10.1 Supported paths

The product should support these transitions:

| From                | To                  | Requirement                                                        |
| ------------------- | ------------------- | ------------------------------------------------------------------ |
| Offline             | Anonymous Reporting | User consents to sharing selected local history                    |
| Offline             | Signed-In           | User creates account and chooses whether to import local history   |
| Anonymous Reporting | Signed-In           | User links anonymous history to account only with explicit consent |
| Signed-In           | Offline             | User can export data and continue locally                          |
| Anonymous Reporting | Offline             | User can stop reporting and continue locally                       |

## 10.2 Migration principles

- Never upload old offline history without explicit confirmation
- Show what will be shared before sharing
- Let users choose “from today onward” or “include past history”
- Warn users when linking anonymous data to an identity
- Preserve original timestamps
- Preserve consent state
- Keep a migration audit trail
- Allow users to cancel before completion

## 10.3 Migration copy example

> “You have 42 local test sessions. You can keep them private, import them into your account, or share selected sessions for research. Nothing will be uploaded unless you choose to continue.”

---

# 11. Core cognitive testing product requirements

## 11.1 Test cadence

The product should support three test cadences:

### Daily

Short habit-forming tests.

Recommended duration: 3–5 minutes.

Includes:

- Context check
- Reaction time
- One rotating micro-test

### Weekly

Deeper but still manageable testing.

Recommended duration: 10–15 minutes.

Includes:

- Paired-associate memory
- Executive function
- Spatial memory
- Working memory

### Monthly

More complete trend review.

Recommended duration: 20–30 minutes.

Includes:

- Longer memory battery
- Delayed recall
- Spatial task
- Processing speed
- Executive task
- Optional language/speech module
- Monthly self-report

## 11.2 Test modules

P0 test modules:

1. **Reaction Time Sprint**
   Measures reaction speed, variability, lapses, anticipations.

2. **Arrow Focus**
   Measures attention, inhibition, distraction cost, speed-accuracy tradeoff.

3. **Symbol Match**
   Measures processing speed and visual scanning.

4. **Sequence Tap**
   Measures working memory and sequence recall.

5. **Pair Learning**
   Measures associative memory, learning slope, recall, forgetting.

6. **Seven-Day Learning Week**
   Measures multi-day learning curve and retention.

P1 test modules:

7. **Map / Route Recall**
   Measures spatial memory and route reproduction.

8. **Shape-Colour Switch**
   Measures executive function and switching cost.

9. **Category Fluency**
   Measures language and semantic access.

P2 test modules:

10. **Picture Description**
    Measures language, speech patterns, content richness.

11. **Everyday Task Simulation**
    Measures functional cognition through errands, shopping, bills, or route planning.

## 11.3 Baseline setup

The product should explain that early sessions establish the user’s personal range.

Baseline requirements:

- Do not overinterpret the first session
- Use a baseline window before strong trend claims
- Indicate when baseline is still forming
- Update baseline carefully over time
- Treat practice effects as expected early on
- Allow recalibration after major life/device changes

Suggested copy:

> “We’re still learning your usual range. Your first few sessions help create a baseline.”

## 11.4 Trend reporting

The product should show:

- Current score versus personal range
- Trend over time
- Confidence/quality indicator
- Impact of sleep/stress/distraction where relevant
- Domain-level summaries
- Session-level detail
- Notes explaining uncertainty

Recommended domain labels:

- Reaction speed
- Attention
- Processing speed
- Working memory
- Learning and recall
- Spatial memory
- Flexibility and switching
- Language, once available

## 11.5 Result language

Use:

- “Within your usual range”
- “A little slower than usual”
- “Outside your recent range”
- “Trend has been stable”
- “Worth watching”
- “Consider discussing sustained changes with a health professional”

Avoid:

- “Dementia risk”
- “Cognitive impairment detected”
- “Alzheimer’s warning”
- “Brain age”
- “You failed”
- “Abnormal”

---

# 12. Data categories

The product should organise data into clear categories users can understand.

## 12.1 Test performance data

Includes:

- Test type
- Date/time
- Accuracy
- Speed
- Completion time
- Errors
- Missed responses
- Learning curve metrics
- Forgetting metrics
- Trend scores
- Quality flags

## 12.2 Session context data

Includes:

- Sleep quality
- Stress level
- Illness
- Distraction
- Effort
- Caffeine timing
- Medication change, optional
- Alcohol/sedating substance context, optional
- Notes

## 12.3 Demographic data

Includes:

- Age range/year of birth
- Region/country
- Language
- Education
- Sex/gender, optional
- Ethnicity, optional
- Handedness
- Vision/hearing limitations
- Digital familiarity

## 12.4 Health/research questionnaire data

Includes optional self-reported information about:

- Cognitive concerns
- Diagnosis history
- Family history
- Sleep
- Mood/stress
- Neurological history
- Daily functioning
- Medication categories
- Care/support situation

## 12.5 Identity/contact data

Only in Signed-In Mode.

Includes:

- Account identifier
- Contact email/phone where provided
- Trial-contact preference
- Communication preferences
- Consent history

## 12.6 Consent data

Includes:

- Consent version
- Consent date/time
- Categories accepted
- Categories declined
- Withdrawal date/time
- Study-specific consent, where applicable

---

# 13. Consent and privacy requirements

## 13.1 Consent surfaces

Consent should appear at:

- First entry into Anonymous Reporting Mode
- First entry into Signed-In research sharing
- Trial-contact opt-in
- Before sharing historical offline data
- Before changing data-sharing scope
- Before joining study-specific modules
- When material consent terms change

## 13.2 Consent design

Consent should be:

- Plain-language
- Layered, with summary first and details available
- Specific by data category
- Separated from terms of service
- Easy to revisit
- Easy to withdraw for future sharing

## 13.3 Data minimisation

The product should collect only what is needed for:

- User self-tracking
- Research contribution the user has consented to
- Trial-contact matching the user has opted into
- Product safety, reliability, and support

The Privacy Act 2020 principles cover why personal information is collected, how it is collected, storage/security, access/correction, retention, use, disclosure, and unique identifiers; the product experience should make these expectations visible and understandable to users. ([Privacy Commissioner][1])

## 13.4 Deletion and withdrawal

The product should distinguish between:

- Delete local data
- Stop future research sharing
- Delete account
- Request removal from future research datasets
- Withdraw trial-contact consent

For already shared research data, the product should be transparent about what can and cannot practically be removed once data has been de-identified, aggregated, analysed, or included in completed research outputs.

## 13.5 Ethics and research governance

If the product is used for health/disability research, ethics review may be required depending on study design, participant population, data sensitivity, and intended use. HDEC states that health and disability studies are reviewed to check they meet established ethical standards and protect participants. ([Health and Disability Ethics Committees][2])

Product requirement:

- The app should support study-specific consent, ethics approval references, researcher identity, study purpose, and participant information sheets where required.

---

# 14. Safety and clinical positioning

## 14.1 Product claim boundary

Initial positioning:

> “A tool for tracking cognitive performance and reaction patterns over time.”

Avoid initial positioning:

> “A dementia screening app.”

> “An Alzheimer’s detection tool.”

> “A diagnostic cognitive assessment.”

Medsafe is New Zealand’s medicines and medical devices safety authority; if the product begins making diagnostic, treatment, or clinical decision-support claims, medical-device review should be scoped before launch or before those claims are used. ([Medsafe][3])

## 14.2 Escalation guidance

The product may provide general guidance such as:

> “If you notice sustained changes, or if you or someone close to you is concerned, consider discussing this with a qualified health professional.”

The product should not say:

> “You should seek urgent care because your score declined.”

Exception: If the product later includes safety questionnaires covering self-harm, acute confusion, stroke symptoms, or medical emergencies, those flows require separate clinical safety design.

## 14.3 Emotional safety

The product should:

- Avoid alarming notifications
- Avoid disease labels in routine reports
- Avoid ranking users harshly
- Explain uncertainty
- Emphasise context
- Encourage professional discussion for sustained concerns

---

# 15. Reporting and dashboard requirements

## 15.1 User dashboard

The dashboard should show:

- Today’s completion status
- Current baseline status
- Recent trend by domain
- Personal range bands
- Session quality flags
- Context notes
- Weekly summary
- Monthly summary
- Export/share options

## 15.2 Domain cards

Each domain card should include:

- Plain-language description
- Current status
- Trend direction
- Confidence level
- Last tested date
- What may affect this domain
- Link to detailed history

Example:

> **Reaction speed**
> Slightly slower than your usual range this week. Sleep quality was also lower than usual.

## 15.3 Research contribution dashboard

Available in Anonymous Reporting and Signed-In Modes.

Should show:

- Sharing on/off
- Data categories shared
- Last successful contribution
- Completed demographics
- Completed questionnaires
- Missing optional research fields
- Consent version
- Withdrawal controls

## 15.4 Trial participation dashboard

Available only in Signed-In Mode.

Should show:

- Trial-contact status
- Last updated date
- Contact preferences
- Eligibility questionnaire status
- Ability to turn off contact
- Explanation that opt-in is not enrolment

---

# 16. Notifications and reminders

## 16.1 Reminder types

P1 requirements:

- Daily test reminder
- Weekly deeper test reminder
- Monthly report reminder
- Seven-Day Learning Week reminders
- Baseline completion reminder
- Export backup reminder for Offline Mode

## 16.2 Reminder principles

Reminders should:

- Be opt-in
- Be quiet by default
- Avoid fear language
- Respect user frequency preferences
- Avoid implying medical urgency

Example:

> “Your weekly memory check is ready.”

Avoid:

> “Don’t miss your dementia warning test.”

---

# 17. Researcher-facing product requirements

This does not require a public researcher portal in v1, but the product should be designed around eventual researcher needs.

## 17.1 Research dataset requirements

Research exports should support:

- Consent status
- Participant mode
- Anonymous or account-linked study ID
- Test session summaries
- Trial-level data where consented
- Demographics
- Questionnaires
- Session context
- Quality flags
- Version history of tests
- Missing data indicators

## 17.2 Research governance requirements

Before data is made available to researchers, the product should require:

- Study purpose
- Approved protocol or governance pathway, where applicable
- Data access scope
- Data retention terms
- Re-identification prohibition
- Publication/attribution rules
- Participant information summary
- Contact person or organisation
- Audit trail of exports/access

## 17.3 Researcher non-goals for v1

V1 should not include:

- Open public researcher downloads
- Self-serve access to raw sensitive data
- Researcher messaging to anonymous users
- Trial recruitment from anonymous reporting users
- Disease-risk predictions for researchers without validation

---

# 18. Accessibility requirements

P0 requirements:

- Large readable text
- High-contrast visual design
- No colour-only instructions
- Keyboard and touch support
- Practice trials
- Simple task instructions
- Plain-language feedback
- Adjustable text size where feasible
- Clear pause/exit controls
- Minimal time pressure outside reaction tasks
- Avoid unnecessary animations

P1 requirements:

- Audio instructions
- Reduced-motion option
- Left-handed/right-handed layout option
- Vision/hearing limitation profile
- Caregiver-assisted onboarding
- Multiple language support

---

# 19. Trust, transparency, and explainability

The product should include a “How this works” section explaining:

- What the tests measure
- Why repeated testing matters
- Why one bad result is not necessarily meaningful
- How baseline works
- What affects performance
- What is shared in each mode
- What the product does not diagnose
- How to export/delete data

Suggested copy:

> “This product looks for patterns over time. A single lower score can happen because of sleep, stress, distraction, illness, device changes, or normal day-to-day variation.”

---

# 20. Key user journeys

## 20.1 New user chooses Offline Mode

1. User opens product
2. Sees three mode choices
3. Chooses “Use privately on this device”
4. Reads short offline explanation
5. Completes baseline setup
6. Takes first daily test
7. Sees “baseline forming” dashboard
8. Later exports JSON backup

## 20.2 Offline user exports and restores data

1. User opens settings
2. Chooses “Export my data”
3. Receives JSON backup
4. Later opens product on same or different browser
5. Chooses “Import backup”
6. Reviews file summary
7. Chooses merge or replace
8. History is restored

## 20.3 Offline user joins Anonymous Reporting

1. User sees research contribution option
2. Opens explanation
3. Reviews data categories
4. Chooses whether to share past history or future-only data
5. Completes consent
6. Receives anonymous ID
7. Completes optional demographics
8. Sees reporting dashboard

## 20.4 Anonymous user stops sharing

1. User opens sharing settings
2. Chooses “Pause/stop research reporting”
3. Sees explanation of future versus already-submitted data
4. Confirms
5. Continues using product locally

## 20.5 Anonymous user creates account

1. User chooses “Create account”
2. Product explains that anonymous history can become linked to identity
3. User chooses whether to link prior anonymous data
4. User creates account
5. User manages research and trial preferences

## 20.6 Signed-in user opts into trial contact

1. User opens research participation settings
2. Reads trial-contact explanation
3. Checks “I’m open to participating in trials”
4. Provides contact preference
5. Completes optional eligibility questions
6. Can later turn off trial contact

---

# 21. Success metrics

## 21.1 Activation

- Percentage of first-time users who complete first test
- Percentage who return for second session
- Percentage who complete baseline window
- Percentage who understand mode selection without support

## 21.2 Retention

- Daily active testing rate
- Weekly test completion rate
- Monthly report open rate
- Seven-Day Learning Week completion rate
- Drop-off by test module

## 21.3 Data quality

- Sessions flagged as distracted
- Incomplete tests
- Invalid reaction-time trials
- Device/input changes
- Missing demographics
- Baseline stability
- Repeat-test reliability

## 21.4 Trust and control

- Export usage
- Delete-data usage
- Consent settings viewed
- Consent withdrawal rate
- Research-sharing opt-in rate
- Account upgrade rate from offline/anonymous modes

## 21.5 Research participation

- Anonymous reporting opt-in rate
- Signed-in research opt-in rate
- Trial-contact opt-in rate
- Completed research profiles
- Longitudinal contribution length
- Study-specific consent completion

---

# 22. MVP scope recommendation

## MVP should include

1. Mode selection on first launch
2. Offline Mode with local history
3. JSON export/import
4. Daily reaction-time test
5. Daily rotating micro-test
6. Weekly pair-learning task
7. Baseline-forming dashboard
8. Anonymous Reporting Mode
9. Anonymous ID
10. Research consent flow
11. Demographics/questions module
12. Signed-In Mode
13. Trial-contact opt-in checkbox
14. Consent management
15. Data deletion/export controls
16. Clear non-diagnostic language

## MVP should defer

- Speech analysis
- Caregiver accounts
- Clinician portal
- Researcher portal
- Trial-matching automation
- Risk prediction
- Brain age
- Full medical-device claim pathway
- Study-specific modules
- Multi-language support beyond initial design readiness

---

# 23. Open product questions

1. Is v1 limited to adults 18+, or will there be a youth/minor pathway later?
2. Which countries will be supported at launch?
3. Will the product collect year of birth or age range?
4. Will anonymous users be allowed to request deletion of previously submitted data, and how will they authenticate that request?
5. How much trial-level data should be shared by default versus summary data?
6. Will researchers receive raw data, aggregated data, or only approved study extracts?
7. Will the product support caregiver-assisted use in v1?
8. Should Offline Mode include encrypted backups in v1 or later?
9. Should users be able to compare themselves to population norms, or only their own baseline?
10. What level of clinical validation is required before stronger wording such as “screening” is used?

---

# 24. Recommended next step

Turn this PRD into three follow-on artifacts:

1. **Consent and data-sharing matrix**
   Exactly what data is collected, stored, shared, exported, and deleted in each mode.

2. **User journey map**
   First-run onboarding, mode migration, test completion, research opt-in, trial opt-in, export/import.

3. **Test battery specification**
   The exact daily/weekly/monthly tests, scoring metrics, baseline logic, and user-facing result language.

[1]: https://www.privacy.org.nz/privacy-principles/?utm_source=chatgpt.com "Office of the Privacy Commissioner | Privacy Act 2020"
[2]: https://ethics.health.govt.nz/hdec-reviews-and-approvals/find-out-if-your-study-requires-hdec-review/?utm_source=chatgpt.com "Find out if your study requires HDEC review"
[3]: https://www.medsafe.govt.nz/?utm_source=chatgpt.com "Medsafe Home Page"
