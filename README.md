# site-speak
contractor gets auto-priced estimates based off of saved inventory, and technicians can verbally log their work.

### RUBRIC
- [ ] 30 pts Project scope is 2-3 times larger than Inventory Management (per group member)
- [ ] 5 pts Technology: Client side state stores (e.g. tanstack query or context)
- [ ] 5 pts Technology: Toasts / global notifications or alerts
- [ ] 5 pts Technology: Error handling (both on api requests and render errors)
- [ ] 5 pts Technology: Network Calls that read and write data
- [ ] 5 pts Technology: Developer type helping (typescript)
- [ ] 5 pts Technology: 10+ pages or views
- [ ] 5 pts Technology: CI/CD pipeline
- [ ] 5 pts Technology: tests run in pipeline, pipeline aborts if they fail
- [ ] 5 pts Technology: linting in pipeline
- [ ] 9 pts Technology: 3+ generic form input components
- [ ] 12 pts Technology: 4+ generic layout components
- [ ] 10 pts Technology: authentication and user account support
- [ ] 5 pts Technology: authorized pages and public pages
- [ ] 5 pts Experience: all experiences mobile friendly
- [ ] 5 pts Experience: 3 instances where elements re-order themselves on smaller screens
- [ ] 20 pts Professional, organized and smooth experience

## Features
```
Admin
├── CRUD operations on projects
|   ├── CRUD stages (demo, prep, build/install, qa)
├── AI find materials-calc prices
├── Manage workers
|   ├── Review Worker shift logs
|   ├── CRUD operations
├── Buy Materials
|   ├── AI alerts when timeline says is time to buy
├── Set Project Timeline/Scheduling

Workers
├── Shift Form
|   ├── Voice to fill out
|   ├── user edit voice-filled form
|   ├── Manual Form (no ai voice)
├── CRUD Shift Form

Everyone
├── Dashboard
├── Login

Auth - Authorization in house stuff
├── User
├── Group (Many to Many between them)
├── Permissions
```

## Pages
A - CRUD Employee
A - CRUD Projects
    - CRUD Stages
A - Project Scheduling
A - CRUD Equipment
A - CRUD Materials
A - CRUD Suppliers
W/A - Review Work Log
W - Fill Work Log
W/A - Home Page / Dashboard
Login Page


## Project Schedule

### Mar. 20, 2026

#### Estimates:

Rubric items:
- [x] 5 pts Technology: Network Calls that read and write data
- [x] 5 pts Technology: CI/CD pipeline
- [x] 5 pts Technology: tests run in pipeline, pipeline aborts if they fail
- [x] 5 pts Technology: linting in pipeline


Features:
- [x] Deployed App that runs
- [x] Have Data in DB
- [x] Minimal Backend to talk to DB


#### Delivered

Rubric Items:
- [x] 5 pts Technology: Network Calls that read and write data
- [x] 5 pts Technology: CI/CD pipeline
- [x] 5 pts Technology: tests run in pipeline, pipeline aborts if they fail
- [x] 5 pts Technology: linting in pipeline

Features:
- [x] Deployed App that runs
- [x] Have Data in DB
- [x] Minimal Backend to talk to DB


### Mar. 24, 2026

#### Estimates:

Rubric items:
- [x] authentication and user account support
- [x] authorized pages and public pages
- [x] 3+ generic form input components

Features:
- [x] Login Page
- [x] RBAC - Roles Based Access
- [x] Color Scheme - Design.md

#### Delivered

Rubric Items:


Features:

### Mar. 27, 2026

#### Estimates:

Rubric items:
Note: These will be throughout the project, this is initial setup
- [ ] Client side state stores
- [x] Toasts / global notifications or alerts
- [x] Error handling

Features:
Note: Will create generic form for all of these
- [x] CRUD Suppliers
- [x] CRUD Materials
- [x] CRUD Equipment
- [x] Home / Dashboard

#### Delivered

Rubric Items:


Features:


### Mar. 31, 2026

#### Estimates:

Rubric items:
- [ ] 10+ pages or views
- [x] 4+ generic layout components

Features:
- [x] CRUD Projects
- [x] CRUD Stages
- [ ] Rest of pages are created

#### Delivered

Rubric Items:


Features:


### Apr. 3, 2026

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [x] Project scope is 2-3 times larger than Inventory Management (per group member)
- [x] Toasts / global notifications or alerts
- [ ] Error handling (both on api requests and render errors)

Features:
- [x] CRUD Employees
- [x] CRUD Worklog
- [x] Project Scheduling

#### Delivered

Rubric Items:


Features:


### Apr. 7, 2026

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] 1+ action(s) can be performed autonomously
- [ ] 1+ action(s) require user confirmation to perform

Features:
- [ ] Voice-To-Text for worklogs
- [ ] AI material estimates
- Will read from the Project Overview (user needs to type everything in here) and find materials/equipment based on project address and supplier address (Omner's genius idea: filter based on address before AI and let user choose how far {make sure AI knows it can return nothing if outside of the area})for each stage of the project. Then go ahead and return a json object that is a project and inside of the project the number of stages with the materials/equipment for that stage. Use a form to show the materials and allow the user to edit them. 
- [ ] Split edit schedule into separate page

#### Delivered

Rubric Items:


Features:


### Apr. 10, 2026 

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] 1+ action(s) automatically adjust the UI when performed
- [ ] Professional, organized and smooth experience

Features:
- [ ] AI Project Scheduling materials recommended purchase based on stage time
- [ ] Design rules of thumb for our UI


#### Delivered

Rubric Items:


Features:



### Apr. 14, 2026

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] Professional, organized and smooth experience
- [ ] Toasts / global notifications or alerts

Features:
- [ ] Implement design for desktop
- [ ] Fine tune error handling and messages - UI

#### Delivered

Rubric Items:


Features:


### Apr. 17, 2026 

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] 3 instances where elements re-order themselves on smaller screens
- [ ] all experiences mobile friendly

Features:
- [ ] Make this work on a phone
- [ ] Make it incredibly intuitive on a phone
- [ ] Easy to use worker voice-to-text on phone

#### Delivered

Rubric Items:


Features:


### Apr. 21, 2026

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] Professional, organized and smooth experience
- [ ] Personal Rubric item: Testing with real people

Features:
- [ ] Beautiful design
- [ ] Smooth transitions
- [ ] No bugs, only features we didn't know about ;)

#### Delivered

Rubric Items:


Features:


### Apr. 24, 2026

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] Project Scope is 2-3 times larger than IM
- [ ] All of them

Features:
- [ ] Final touch-ups, make sure everything works.

#### Delivered

Rubric Items:


Features:
Backlog Features:
- Customizable Worker Forms
- Error in estimates (waste factor and markup)
- Real Material usage

## Geocoding and distance-filtered estimates

**Suppliers** and **projects** store `latitude` / `longitude`. Creating or updating a supplier or project **geocodes the address** (OpenStreetMap Nominatim by default). If geocoding fails, the API returns **400** with a short error message.

Configure the **`Geocoding`** section in `api/appsettings.json` (`BaseUrl`, `UserAgent`, optional `DevBypass`). Development uses the same merged config as other environments unless you override locally (e.g. user secrets or env vars).

**Equipment** references a **rental supplier** via `rentalSupplierId` (same `supplier` table as material vendors). Regenerate supplier/equipment SQL from CSVs with `database/scripts/generate_geo_seeds.py` (uses Nominatim; respects `database/geocode_cache.json`). After schema changes, reset Postgres with `docker compose down -v` and bring the stack back up so init scripts rerun.

## AI material estimates (API configuration)

Material estimates **pre-filter** the materials and equipment catalogs by **Haversine distance** from the project job site to each row’s supplier (or equipment’s rental supplier), using **`radiusMiles`** from the request (default **50**, max **500**). Only the reduced catalog is sent to the LLM, which avoids huge prompts when the inventory is large. If the project has no coordinates, the server skips filtering and adds a warning.

Configure the **`Llm`** section in `api/appsettings.json`, or override with environment variables such as `Llm__ChatCompletionsUrl` (double underscore nests into the section). Material-estimate debug echo of raw model output is controlled separately under **`MaterialEstimate`** (`IncludeLlmRawContentInResponse`, Development only).

Default URL is **`https://ai-snow.reindeer-pinecone.ts.net:9292/v1/chat/completions`**. Default model id is **`gemma4-31b`** (matches the `id` from that host’s **`GET /v1/models`** — llama.cpp `--alias` for the Gemma 4 31B IT GGUF). Override with `Llm__Model` or `LLM_MODEL` if you point at another server.

**Finding the exact `model` string:** many OpenAI-compatible servers list ids at **`GET …/v1/models`** (same host/base as chat, path `/v1/models`). Example: `curl -sS https://your-host:9292/v1/models | jq` and use the `id` field from the response. **Ollama** often uses ids like `gemma4`, `gemma4:31b`, or `gemma4:26b` instead of the Hugging Face path. The listener on that port must use TLS; **`http://` there often yields HTTP 400** (“Client sent an HTTP request to an HTTPS server”). Outbound LLM requests send **`Content-Type: application/json` only** (no `Authorization` header). If the API runs in **Docker**, avoid `localhost` for the LLM URL unless the model listens there from the container’s network namespace.

- **`Llm:ChatCompletionsUrl`** — Full URL to an OpenAI-compatible `POST .../v1/chat/completions` endpoint.
- **`Llm:Model`** — Model name sent to that endpoint.

