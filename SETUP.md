# Envoy Angel Backend Setup Guide

This guide provides detailed instructions for setting up and configuring the Envoy Angel backend server.

## Prerequisites

1. Node.js >= 18.0.0
2. MongoDB >= 5.0
3. Gmail account for email notifications
4. Paystack account for payments

## Initial Setup

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd envoyserver
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/envoy_angel

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
JWT_COOKIE_EXPIRE=30

# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# Rate Limiting
RATE_LIMIT_WINDOW=15  # in minutes
RATE_LIMIT_MAX=100    # requests per window

# Shipping Configuration
VAT_RATE=0.075                # 7.5%
BASE_RATE_INTERNATIONAL=20    # per kg
BASE_RATE_LOCAL=10           # per kg
INSURANCE_RATE_BASIC=0.01    # 1% of base amount
INSURANCE_RATE_PREMIUM=0.02   # 2% of base amount

# Admin Configuration
ADMIN_EMAIL=admin@envoyangel.com
ADMIN_PASSWORD=your_admin_password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
ADMIN_PHONE=+2348000000000
ADMIN_COUNTRY=NG

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

## Database Setup

1. Install MongoDB:
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)
   - Create a database named 'envoy_angel'

2. Run database migrations:
```bash
# The database schema will be created automatically when you start the server
npm run dev
```

## Email Configuration

1. Set up Gmail for sending emails:
   - Go to your Google Account settings
   - Enable 2-Step Verification
   - Generate an App Password:
     1. Go to Security settings
     2. Select 'App passwords'
     3. Generate a new app password for 'Mail'
   - Use this password as EMAIL_PASSWORD in .env

## Paystack Integration

1. Create a Paystack account:
   - Go to [Paystack](https://paystack.com)
   - Sign up for an account
   - Complete business verification

2. Get API keys:
   - Log in to your Paystack Dashboard
   - Go to Settings > API Keys & Webhooks
   - Copy your test/live secret key
   - Add to .env as PAYSTACK_SECRET_KEY

## Admin Account Setup

1. Configure admin details in .env:
```env
ADMIN_EMAIL=admin@envoyangel.com
ADMIN_PASSWORD=your_secure_password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

2. Create admin account:
```bash
npm run create-admin
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm run prod
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678",
  "country": "NG"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

### Shipment Endpoints

#### Create Shipment
```http
POST /api/shipments
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "international",
  "sender": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "address": {
      "street": "123 Sender St",
      "city": "Lagos",
      "country": "NG",
      "postalCode": "100001"
    }
  },
  "recipient": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+447911123456",
    "address": {
      "street": "456 Recipient Rd",
      "city": "London",
      "country": "GB",
      "postalCode": "SW1A 1AA"
    }
  },
  "packages": [
    {
      "packageType": "parcel",
      "weight": 5.5,
      "dimensions": {
        "length": 30,
        "width": 20,
        "height": 15
      },
      "description": "Electronics",
      "isFragile": true
    }
  ],
  "pickup": {
    "location": {
      "street": "123 Pickup St",
      "city": "Lagos",
      "country": "NG",
      "postalCode": "100001"
    },
    "date": "2025-02-10T10:00:00Z"
  },
  "insurance": {
    "type": "basic",
    "coverage": 1000
  }
}
```

### Payment Endpoints

#### Initialize Payment
```http
POST /api/payments/initialize
Content-Type: application/json
Authorization: Bearer <token>

{
  "shipmentId": "shipment_id_here"
}
```

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Email verification
- Rate limiting
- CORS protection
- Input validation and sanitization
- Cookie security
- MongoDB injection protection

## Error Handling

The API uses standard HTTP response codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

Error responses follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Monitoring and Maintenance

1. Check server health:
```http
GET /health
```

2. View logs:
```bash
# Development logs
npm run dev

# Production logs (using PM2)
pm2 logs envoy-angel
```

## Deployment Checklist

1. Update environment variables:
   - Set NODE_ENV=production
   - Update SERVER_URL and CLIENT_URL
   - Set secure JWT_SECRET
   - Configure production database URI
   - Set up production email service
   - Update Paystack live keys

2. Security measures:
   - Enable HTTPS
   - Set secure cookie options
   - Configure CORS properly
   - Set up rate limiting
   - Enable MongoDB authentication

3. Performance optimization:
   - Enable compression
   - Set up caching
   - Configure PM2 for process management

## Troubleshooting

1. Database connection issues:
   - Check MongoDB service is running
   - Verify connection string
   - Check network connectivity
   - Ensure database user permissions

2. Email sending failures:
   - Verify email credentials
   - Check spam settings
   - Ensure less secure app access (if needed)
   - Test email service connection

3. Payment integration issues:
   - Verify Paystack API keys
   - Check webhook configuration
   - Test in Paystack sandbox mode
   - Monitor payment logs

## Support

For technical support:
1. Check logs for error messages
2. Review documentation
3. Contact development team
4. Submit issue on repository

## License

This project is licensed under the MIT License.
