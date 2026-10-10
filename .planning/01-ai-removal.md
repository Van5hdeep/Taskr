# 01 — AI removal (DONE)

**Decision:** remove AI completely until the platform is fully built.

## Already removed (uncommitted on `tables` before this session)
- `src/ai/executor.js`, `router.js`, `systemPrompt.js`, `tools.js`: the Gemini function-calling agent ("TASKR OS")
- `src/chat/handler.js`, `src/chat/LocalIntentRouter.js`: chat handling and the regex intent router
- `@google/genai` dependency
- `GEMINI_API_KEY` in `.env.example`
- The chat bar in `App.jsx`

## Removed in this session
| Item | Why |
|---|---|
| `src/services/taskService.js` | Backend for the AI tools; nothing imported it any more |
| `src/supabase/client.js` | Re-export used only by `taskService.js` |
| `src/components/TaskCard.tsx`, `ActiveActionPlan.tsx`, `UrgencyTag.tsx`, `PanicDump.tsx`, `Header.tsx` | Original AI-era task UI ("Generate Draft" action, AI panic dump); unused |
| `src/hooks/useCountdown.ts`, `src/types/task.ts` | Used only by the files above |
| `server.js` + `npm run server` / `npm start` | Mock "AI" API (random urgency, fake generated subtasks); the frontend never called it |
| `express`, `cors`, `dotenv` dependencies | Used only by `server.js` |
| `PORT` in `.env.example` | Used only by `server.js` |
| README line about "autonomous chatbot sorting" | Described a removed feature |

## Checks
- `.env` holds only `PORT`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. There is no AI key in it. `PORT` is now unused and you can delete it.
- `npm run build` passes after the removal.
- A search of `src/` finds no remaining Gemini, OpenAI or chat references.

## Before AI comes back (future, not now)
- Model calls must go through a server (a Supabase Edge Function) so no key ever reaches the browser.
- Tools should cover all four products, not only tasks.
- Every action needs user confirmation and an undo.
