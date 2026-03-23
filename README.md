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
- [ ] 5 pts Technology: Network Calls that read and write data
- [ ] 5 pts Technology: CI/CD pipeline
- [ ] 5 pts Technology: tests run in pipeline, pipeline aborts if they fail
- [ ] 5 pts Technology: linting in pipeline


Features:
- [ ] Deployed App that runs
- [ ] Have Data in DB
- [ ] Minimal Backend to talk to DB


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
- [ ] authentication and user account support
- [ ] authorized pages and public pages
- [ ] 3+ generic form input components

Features:
- [ ] Login Page
- [ ] RBAC - Roles Based Access
- [ ] Color Scheme

#### Delivered

Rubric Items:


Features:

### Mar. 27, 2026

#### Estimates:

Rubric items:
Note: These will be throughout the project, this is initial setup
- [ ] Client side state stores
- [ ] Toasts / global notifications or alerts
- [ ] Error handling

Features:
Note: Will create generic form for all of these
- [ ] CRUD Suppliers
- [ ] CRUD Materials
- [ ] CRUD Equipment
- [ ] Home / Dashboard

#### Delivered

Rubric Items:


Features:


### Mar. 31, 2026

#### Estimates:

Rubric items:
- [ ] 10+ pages or views
- [ ] 4+ generic layout components

Features:
- [ ] CRUD Projects
- [ ] CRUD Stages
- [ ] Rest of pages are created

#### Delivered

Rubric Items:


Features:


### Apr. 3, 2026

#### Estimates:

Rubric items:
Note: We are just working more on these, can't really finish a singular one
- [ ] Project scope is 2-3 times larger than Inventory Management (per group member)
- [ ] Toasts / global notifications or alerts
- [ ] Error handling (both on api requests and render errors)

Features:
- [ ] CRUD Employees
- [ ] CRUD Worklog
- [ ] Project Scheduling

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

