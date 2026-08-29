# Backend Architecture (Laravel-style MVC)

```
backend/src/
├── controllers/              # HTTP handlers (flat — no feature subfolders)
│   ├── AuthController.js
│   ├── TenantController.js
│   ├── GymController.js
│   └── MemberController.js
│
├── services/                 # Business logic
│   ├── AuthService.js
│   ├── TenantService.js
│   ├── GymService.js
│   └── MemberService.js
│
├── models/                   # Data access (Prisma)
│   ├── UserModel.js
│   ├── AuthModel.js
│   ├── TenantModel.js
│   ├── GymModel.js
│   └── MemberModel.js
│
├── routes/
│   ├── index.js
│   ├── auth.routes.js
│   ├── tenant.routes.js
│   ├── gym.routes.js
│   └── member.routes.js
│
├── validators/
│   ├── auth.validator.js
│   ├── gym.validator.js
│   └── member.validator.js
│
├── middlewares/
├── config/
├── utils/
├── app.js
└── server.js
```

## Style

Functional **named exports** only (no classes):

```js
export const list = asyncHandler(async (req, res) => { ... });
export const login = async ({ email, password }) => { ... };
export const findById = (id) => prisma.user.findFirst({ ... });
```

## Request flow

```
routes/auth.routes.js → AuthController → AuthService → UserModel → DB
```

## Adding a feature (e.g. Attendance)

1. `models/AttendanceModel.js`
2. `services/AttendanceService.js`
3. `controllers/AttendanceController.js`
4. `validators/attendance.validator.js`
5. `routes/attendance.routes.js`
6. Register in `routes/index.js`
