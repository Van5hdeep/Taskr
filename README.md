<p align="center">
  <img src="/TASKR.png" alt="TASKR Logo" width="160" />
</p>

<h1 align="center">TASKR</h1>
<p align="center"><strong>DO IT FASTER WITH TASKR</strong></p>

---

## Architectural Deep Dive & Core Features

### 1. The Task Dump Upload Pipeline
The primary interface for workspace ingestion is the **Task Dump**. This input subsystem allows users to rapid-fire raw text data without worrying about initial structure. 
* **State Operations:** When the user triggers "Upload Task", the interface dynamically shifts state to read "Uploading task...". This blocks UI interactions, defaults fallback parameters, and communicates asynchronously with external relational layers.
* **Pre-Saving Subtask System:** Before initializing the upload stream, the container provides an interface layout to manually append structured, nested subtasks to a temporary array.
* **Default Structure Fallback:** If a task description is submitted with no subtasks defined, a structural safety interceptor injects a default subtask schema labeled `[{ text: "Task over", completed: false }]` to guarantee data type uniformity across the relational backend.

### 2. Context-Aware Task Stickers & In-Line Editing
Tasks are displayed inside a modular grid as interactive sticker cards. The visual hierarchy relies on intuitive spatial signals rather than stressful data overhead.
* **Simplified Urgency Language:** TASKR completely removes intimidating raw numeric scores (e.g., "9/10 urgency"). Priority is signaled entirely through soft modern pastel card surfaces mapped to an accessible, crisp vocabulary: High Urgency displays as a pastel red card labeled **Urgent**, Medium Urgency displays as a pastel amber card labeled **Important**, and Low Urgency transitions to a pastel green card surface labeled **Not Important**.
* **Inline Local Modification Engine:** Positioned directly beside the deletion vector is a precision-mapped pencil interface. Activating this node toggles local template literals into fully editable input text configurations. Users can dynamically modify descriptions, update titles, or shift urgency tags.
* **Integrated Modal Alerts:** To replace non-cohesive native browser confirmation popups, TASKR utilizes an internal Application Modal subsystem. When a user marks the final nested subtask complete, an inline callback intercepts the operation and renders a premium theme-compliant confirmation modal asking to clear the card.

### 3. The Real-Time Consistency Board
The historical contribution grids common in dev tools have been replaced by a real-time **Consistency Board**. This tracking scale operates as a direct mathematical reflection of the user's active visible workspace state.
* **Proportional Execution Formula:** The mathematical position of the tracking marker is calculated dynamically using the active array length:
  $$\text{Reliability Score} = \frac{\text{Completed Visible Tasks}}{\text{Total Visible Tasks}}$$
* **Dynamic Alignment Mechanics:** If a user has exactly five tasks loaded on the dashboard, completing one task shifts the indicator element precisely 1/5th (20%) across the scale layout. Conversely, uploading a new, uncompleted task instantly dilutes the success ratio and slides the marker back to preserve mathematical precision.
* **Shifting State Indicators:** The score range ($0.0$ to $1.0$) drives a horizontal container width configuration, updating the indicator's face state instantly:
  * Score < 0.3: 🥲 (Struggling) | Score 0.3 - 0.59: 😐 (Neutral) | Score 0.6 - 0.79: 😁 (Happy) | Score >= 0.8: 😃 (Excellent)

### 4. Interactive Monthly Calendar Matrix
To provide deep chronological clarity, TASKR embeds a comprehensive monthly calendar grid mapping task allocations visually.
* **Defensive Anti-Crash Architecture:** To prevent fatal React rendering failures ("White Screen of Death") caused by empty or volatile database strings, the cell parser uses a type-safe optional chaining evaluation hook: `task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''`.
* **Visual Task Mapping:** Valid scheduled items are filtered and mapped straight onto their corresponding day cell blocks as clean, horizontal task pills.

### 5. High-Fidelity Notification and Time Engines
TASKR features advanced chronometer checking, separating time warning systems from card components into a top-right mounted notification engine powered by a managed event loop.
* **Synchronized Audio Chime:** Every visual alert is bound to a native browser audio utility executing a clean, non-intrusive digital chime at a calibrated volume level (`0.4`).
* **High-Fidelity Threshold Notifications:** Utilizing local storage identifiers to block duplicate alerts during re-renders, the notification loop monitors deadlines to throw real-time alerts for Half-Time Milestones and 1-Hour Final Notices.
* **Overtime Grace Window and Death Clock:** The moment a deadline timestamp is breached, the card card shifts to a high-contrast blinking warning state reading **OVERTIME**. It starts a hard 24-hour countdown. If the task is not completed or erased before the 24 hours expire, an automated background execution purges the record from the database.

### 6. Autonomous LLM Copilot & AI Pipeline
The platform leverages a client-side API configuration running the **Google Gemini 1.5 Flash** model to provide real-time textual intelligence and autonomous state mutations via a floating, drawer-style Chatbar.
* **Automated Smart Title Extraction:** On task creation, the long-form narrative text from the user is piped into a structured API prompt instruction forcing Gemini to summarize the data into a punchy 2-3 word title with no quotation marks or markdown clutter. If an internet drop occurs, a fallback local keyword regex analyzer splits the text string, extracts the action verb, capitalizes it, and builds a clean title locally.
* **Conversational Depth and Advice:** The Chatbar system prompt trains the model to recognize greetings, engage in casual productivity coaching, and offer execution strategies.
* **Natural Language Sorting & Batch Mutations:** When commanded to "arrange tasks priority wise," the chat agent loops through the state collection, sorts the arrays into a strict descending ranking, and shifts the UI layout. When commanded to perform sweeping changes (e.g., "change all urgent tasks to not important"), the AI parses user intent, executes a batch update query on the Supabase backend, and updates local state anchors.

---

## Technical Infrastructure

| Technical Vector | Technologies Used | Description & Operational Scope |
| :--- | :--- | :--- |
| **Frontend Core** | React 18, Vite | Powers the reactive component tree, virtual DOM rendering, and hot-module reloading. |
| **Styling Architecture**| Tailwind CSS | Handles modern utility-first fluid design layouts, responsive viewports, and custom layouts. |
| **Database & Auth Backend**| Supabase | Cloud relational infrastructure handling secure sessions, user isolation constraints, and real-time JSONB mutations. |
| **Artificial Intelligence**| Google Gemini 1.5 Flash API | Asynchronous natural language processing, automated entity summary generation, and conversational state control. |
| **Notification Engine** | Sonner | Orchestrates high-fidelity, standalone top-right toast alerts synchronized with the audio chime utility. |
| **Animation Layers** | ClickSpark (HTML5 Canvas) | Inline interactive component rendering localized particle explosions on mouse tap. |
| **Icons & Vectors** | Lucide React | Provides the clean interface visual indicators (Pencil, Trash, Alerts). |
| **Development IDE** | Cursor | AI-first code editor used for structural layout tracking and logical code generation. |
| **Runtime Environment**| Antigravity | Core presentation host container executing real-time full-stack build deployment. |

---

### 🗄️ Database Schema Architecture
TASKR utilizes a high-performance relational Supabase instance optimized for structural query efficiency and real-time state manipulation. The system relies on a single-table core schema mapped with strict constraints:

| Column Field | Data Type | Default / Constraints | Operational Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `gen_random_uuid() / PRIMARY KEY` | Global unique identifier for individual task blocks. |
| `user_id` | `UUID` | `auth.users(id) / REFERENCES / NOT NULL` | Multi-tenant isolation anchor securely tracking owner state. |
| `title` | `TEXT` | `NOT NULL` | The concise textual identifier generated by the hybrid AI engine. |
| `description` | `TEXT` | `Nullable` | Deep narrative input provided by the raw user task stream dump. |
| `urgency_label` | `TEXT` | `'Important' / CHECK IN ('Urgent', 'Important', 'Not Important')` | Core color-mapped metric framework replacing friction-heavy raw numbers. |
| `is_completed` | `BOOLEAN` | `false` | Global completion state tracker feeding the live Consistency Board. |
| `sub_tasks` | `JSONB` | `'[]'::jsonb` | Nested array structure accommodating modular dynamic checklist maps. |
| `deadline` | `TIMESTAMPTZ`| `Nullable` | Target timestamp tracking threshold alerts and Overtime death clocks. |
| `created_at` | `TIMESTAMPTZ`| `timezone('utc'::text, now()) / NOT NULL` | Base initialization marker used to calculate the 50% half-time warning scale. |

*Row Level Security (RLS) is explicitly enabled on this schema. All read, write, update, and batch deletion vectors are strictly bounded by user-isolation data policies (`auth.uid() = user_id`).*

---

### 🔑 Hackathon Evaluation & Pre-Loaded Judge Profiles
To ensure an optimal, friction-free evaluation run during presentation judging, TASKR bypasses arbitrary registration steps by pre-seeding the database and client-side code configuration with dedicated evaluation profiles. 

The login panel interface comes fully integrated with pre-loaded mock data and automated task timelines to show off the countdown sound chimes, the autonomous chatbot sorting, and the live calendar matrices out-of-the-box:

* **Judge Testing Account Identity:** `judge12@gmail.com`
* **Secure Access Key:** `judge123`

*Selecting this profile automatically initializes a curated dashboard layout pre-populated with interactive tasks spanning multi-tier urgency categories, operational checklist matrices, and active countdown targets.*

---

## Installation & Local Deployment

```bash
# Clone the workspace repository
git clone https://github.com/your-repository/taskr.git
cd taskr

# Install dependencies
npm install
npm install sonner

# Launch the development server
npm run dev
```
