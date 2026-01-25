# Prajwalan 2K26 - Backend API

Node.js + Express + MongoDB backend API for the Prajwalan 2K26 event management system.

## Features

- **RESTful API**: Clean, consistent API design
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Admin, Evaluator, and Team Lead roles
- **MongoDB Integration**: Mongoose ODM for data modeling
- **Weighted Scoring System**: Student (30%) and Staff (70%) evaluator weights
- **Domain-Based Filtering**: Evaluators assigned to specific domains
- **Flash Round Support**: Special round for selected teams

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

## Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

## Installation

```bash
# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
PORT=5001
FRONTEND_URL=http://localhost:5173
```

## Database Setup

```bash
# Seed the database with sample data
node scripts/seed.js
```

This will create:
- 10 sample teams
- 24 evaluators (8 student + 16 staff) across 8 domains
- Admin user
- Sample tasks for each round

## Development

```bash
# Start development server
npm run dev
```

The API will be available at `http://localhost:5001`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Admin Routes (Protected)
- `GET /api/admin/teams` - Get all teams
- `GET /api/admin/teams/:teamId` - Get single team
- `PUT /api/admin/teams/:teamId/tasks/:round` - Update tasks
- `POST /api/admin/teams/:teamId/publish/:round` - Publish tasks
- `POST /api/admin/publish-all` - Publish all tasks
- `POST /api/admin/teams/:teamId/flash-round` - Select for Flash Round
- `DELETE /api/admin/teams/:teamId/flash-round` - Remove from Flash Round
- `GET /api/admin/leaderboard` - Get ranked teams

### Evaluator Routes (Protected)
- `GET /api/evaluator/profile` - Get evaluator profile
- `GET /api/evaluator/teams` - Get teams (domain filtered)
- `GET /api/evaluator/teams/:teamId` - Get team details
- `GET /api/evaluator/search/:teamNumber` - Search team by number
- `POST /api/evaluator/teams/:teamId/score/:round` - Submit score
- `GET /api/evaluator/flash-round-teams` - Get Flash Round teams

### Team Lead Routes (Protected)
- `GET /api/teamlead/dashboard` - Get team dashboard
- `GET /api/teamlead/tasks` - Get visible tasks

## Data Models

### User
- email, password, name, role
- Roles: admin, evaluator, teamlead
- Evaluators have: evaluatorType (student/staff), domain

### Team
- teamName, teamNumber, domain
- members: [{ name, rollNumber, year, branch }]
- tasks: { round1, round2, round3, round4 }
- scores: Weighted scoring with evaluations array
- isFlashRoundSelected, totalScore

## Scoring System

- **Round 1**: Max 30 points (Project Explanation)
- **Round 2**: Max 20 points (Progress Demo)
- **Round 3**: Max 50 points (Final Presentation)
- **Round 4**: Max 20 points (Flash Round - selected teams only)

### Weighted Scoring
- Student Evaluators: 60% weight
- Staff Evaluators: 40% weight
- Final score calculated automatically on save

## Security

- Passwords hashed with bcryptjs
- JWT tokens expire in 7 days
- Protected routes require valid JWT
- Role-based middleware for authorization
- CORS configured for frontend origin

## Login Credentials (Development)

```
Admin:          srkraceofficial@gmail.com / prajwalan@2k26
Student Eval:   student.eval.1@prajwalan.com / eval123
Regular Eval:   evaluator.1@prajwalan.com / eval123
Team Lead:      team1@prajwalan.com / team123
```

## Project Structure

```
├── config/          # Database configuration
├── middleware/      # Authentication middleware
├── models/          # Mongoose models
├── routes/          # API routes
│   ├── auth.js      # Authentication routes
│   ├── admin.js     # Admin routes
│   ├── evaluator.js # Evaluator routes
│   └── teamlead.js  # Team lead routes
├── scripts/         # Utility scripts
│   └── seed.js      # Database seeding
└── server.js        # Application entry point
```

## Domains

1. Web Development
2. App Development
3. AI/ML
4. IoT
5. Cybersecurity
6. Blockchain
7. Game Development
8. Cloud Computing

## License

Proprietary - SRKR ACE Prajwalan 2K26
