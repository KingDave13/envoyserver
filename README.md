# Envoy Angel Backend

Backend server for the Envoy Angel shipping and logistics platform. This server provides a robust API for managing shipments, user accounts, payments, and tracking.

## Features

- **User Management**
  - Authentication with JWT
  - Email verification
  - Password reset
  - Profile management
  - Address book
  - Saved locations

- **Shipment Management**
  - International and local shipping
  - Multiple package support
  - Real-time tracking
  - Cost calculation
  - Insurance options
  - Draft saving
  - Timeline tracking

- **Payment Integration**
  - Paystack integration
  - Multiple payment methods
  - Payment verification
  - Refund processing
  - Transaction history

- **Security**
  - JWT authentication
  - Password hashing
  - Input validation
  - Rate limiting
  - CORS protection
  - Cookie security

- **Email Notifications**
  - Welcome emails
  - Verification emails
  - Password reset
  - Shipment confirmations
  - Status updates
  - Payment receipts

## Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT
- Nodemailer
- Paystack
- Express Validator
- Mongoose

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middleware/     # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── scripts/        # CLI scripts
```

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

For detailed setup instructions, see [SETUP.md](SETUP.md).

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected routes require a Bearer token:
```
Authorization: Bearer <token>
```

### Available Routes

#### Auth Routes
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `POST /auth/forgot-password` - Request password reset
- `PUT /auth/reset-password/:token` - Reset password
- `GET /auth/verify-email/:token` - Verify email

#### User Routes
- `PUT /users/profile` - Update profile
- `GET /users/addresses` - Get addresses
- `POST /users/addresses` - Add address
- `PUT /users/addresses/:id` - Update address
- `DELETE /users/addresses/:id` - Delete address
- `GET /users/saved-locations` - Get saved locations
- `POST /users/saved-locations` - Add saved location
- `PUT /users/saved-locations/:id` - Update saved location
- `DELETE /users/saved-locations/:id` - Delete saved location

#### Shipment Routes
- `POST /shipments` - Create shipment
- `GET /shipments` - List shipments
- `GET /shipments/:id` - Get shipment
- `POST /shipments/draft` - Save draft
- `GET /shipments/draft/:id` - Get draft
- `POST /shipments/calculate-cost` - Calculate cost
- `GET /shipments/track/:trackingNumber` - Track shipment

#### Payment Routes
- `POST /payments/initialize` - Initialize payment
- `GET /payments/verify/:reference` - Verify payment
- `GET /payments/:id` - Get payment details
- `POST /payments/:id/refund` - Process refund

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run prod` - Start production server
- `npm run create-admin` - Create admin user
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

### Environment Variables

See `.env.example` for all required environment variables.

### Code Style

- ESLint for linting
- Prettier for code formatting
- Airbnb style guide

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

See [SETUP.md](SETUP.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@envoyangel.com or raise an issue in the repository.
