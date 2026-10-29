# FinTech Platform

A comprehensive microservices-based fintech platform built with Node.js, React, and PostgreSQL. The platform provides core banking functionality including user management, wallet management, transactions, payments, fraud detection, and notifications.

## Architecture Overview

### Services

1. **API Gateway** (Port 3000)
   - Central entry point for all client requests
   - Authentication and authorization
   - Rate limiting and request validation
   - Routes requests to appropriate microservices

2. **User Service** (Port 3001)
   - User registration and authentication
   - Profile management
   - JWT token generation
   - Redis caching for performance

3. **Wallet Service** (Port 3002)
   - Multi-currency wallet support
   - Account balance management
   - Wallet creation and management
   - Kafka event publishing

4. **Transaction Service** (Port 3003)
   - Transaction processing and ledger
   - Idempotency for safe retries
   - Event-driven transaction updates
   - Integration with ledger service

5. **Payment Service** (Port 3004)
   - External bank transfers
   - NIBSS integration for Nigerian banks
   - Account validation
   - Transfer status tracking

6. **Fraud Service** (Port 3005)
   - Real-time fraud detection
   - Risk scoring
   - Suspicious transaction alerts
   - Configurable fraud rules

7. **Notification Service** (Port 3006)
   - Email notifications via Nodemailer
   - SMS notifications via Twilio
   - Event-driven notifications
   - Transaction confirmations

8. **NIBSS Mock Service** (Port 3007)
   - Mock bank transfer API
   - Account validation simulation
   - Testing and development

9. **Ledger Service** (Port 3008)
   - Posts ledger entries for transactions
   - Coordinates wallet balance updates

10. **DLQ Processor** (Port 3009)
    - Processes messages routed to Kafka dead-letter queues

### Frontend

- **React Web Application** (Port 3010)
  - Modern UI with Tailwind CSS
  - Dashboard with wallet overview
  - Transfer interface
  - Transaction history
  - User profile management
  - Responsive design

## Tech Stack

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Message Queue**: Kafka
- **Authentication**: JWT
- **Logging**: Winston
- **Validation**: Joi

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Notifications**: React Hot Toast

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Workspace**: pnpm and Nx

## Prerequisites

- Docker & Docker Compose
- Node.js 20.19+ or 22.12+ (for local development)
- pnpm 9.8 or later

## Getting Started

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/qzee-dev/fintech-platform.git
   cd fintech-platform
   ```

2. **Start all services**
   ```bash
   docker compose up --build
   ```

3. **Wait for services to be ready**
   ```
   Services will be available at:
   - API Gateway: http://localhost:3000
   - Web Frontend: http://localhost:3010
   - User Service: http://localhost:3001
   - Wallet Service: http://localhost:3002
   - Transaction Service: http://localhost:3003
   - Payment Service: http://localhost:3004
   - Fraud Service: http://localhost:3005
   - Notification Service: http://localhost:3006
   - NIBSS Mock: http://localhost:3007
   - Ledger Service: http://localhost:3008
   - DLQ Processor: http://localhost:3009
   - Kafka UI: http://localhost:8080
   ```

### Local Development

1. **Install workspace dependencies**
   ```bash
   pnpm install
   ```

2. **Run an Nx service target** (with its required dependencies configured)
   ```bash
   pnpm nx run user-service:serve
   ```
   The frontend can be run separately with `PORT=3010 REACT_APP_API_URL=http://localhost:3000/api pnpm --dir services/web start`.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-token` - Verify a token
- `GET /api/profile/...` - User profile routes

### Wallet Management
- `GET /api/wallet/user/:userId` - Get user wallets
- `POST /api/wallet/create` - Create new wallet
- `GET /api/wallet/:walletId` - Get wallet details

### Transactions
- `POST /api/transaction/create` - Create transaction
- `GET /api/transaction/:transactionId` - Get transaction details
- `GET /api/transaction/wallet/:walletId` - Get wallet transactions

### Payments
- `POST /api/payment/bank-transfer` - Initiate bank transfer
- `GET /api/payment/status/:reference` - Check transfer status
- `POST /api/payment/validate-account` - Validate account number

### Fraud Detection
- `POST /api/fraud/check` - Check transaction for fraud
- `GET /api/fraud/alerts/:userId` - Get fraud alerts for user

### Notifications
- `POST /api/notification/email` - Send email
- `POST /api/notification/sms` - Send SMS

The API Gateway health endpoint is `GET /health`. The project does not currently
serve Swagger UI at `/api-docs`; the endpoint reference is in [docs/API.md](docs/API.md).

## Environment Variables

Compose reads the following optional values from a root `.env` file:
```env
JWT_SECRET=replace-this-development-secret
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE=your-twilio-phone-number
```

Compose configures service-to-service URLs and Kafka internally. PostgreSQL uses
`fintech_user` / `fintech_secure_password` and database `fintech_db` as defined
in `docker-compose.yaml`; `FRAUD_THRESHOLD` is currently set there to `500000`.

## Testing

Run the service tests with Nx, for example `pnpm nx run user-service:test`.

## Project Structure

```
fintech-platform/
├── services/
│   ├── api-gateway/
│   ├── dlq-processor/
│   ├── fraud-service/
│   ├── ledger-service/
│   ├── mock-services/nibss-mock/
│   ├── notification-service/
│   ├── payment-service/
│   ├── transaction-service/
│   ├── user-service/
│   ├── wallet-service/
│   ├── web/
│   └── web-e2e/
├── libs/shared-libs/
├── docs/
├── docker-compose.yaml
├── package.json
└── pnpm-workspace.yaml
```

## Key Features

✅ **User Management**
- Secure authentication with JWT
- Password hashing with bcrypt
- Redis session caching

✅ **Wallet Management**
- Multiple wallets per user
- Real-time balance updates
- Account freeze functionality

✅ **Transaction Processing**
- Idempotent transaction creation
- Event-driven processing
- Ledger integration
- Transaction status tracking

✅ **Payment Processing**
- Bank transfer support
- NIBSS integration
- Account validation
- Payment status monitoring

✅ **Fraud Detection**
- Real-time fraud scoring
- Configurable detection rules
- Alert system
- Suspicious transaction logging

✅ **Notifications**
- Email notifications
- SMS alerts via Twilio
- Event-driven delivery
- Transaction confirmations

✅ **Modern Frontend**
- Responsive design
- Real-time dashboard
- Secure token management
- Intuitive user interface

## Performance Considerations

- **Caching**: Redis for session and user data caching
- **Async Processing**: Kafka for asynchronous event handling
- **Database Optimization**: Indexed queries and proper schema design
- **Rate Limiting**: API gateway rate limiting
- **Idempotency**: Safe retry mechanisms for transactions

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation with Joi
- Rate limiting
- Transaction idempotency for replay attack prevention
- Fraud detection

## Monitoring & Logging

- Winston logging across all services
- Structured logging with timestamps
- Error tracking and reporting
- Service health checks

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Machine learning fraud detection
- [ ] Cryptocurrency integration
- [ ] API rate limiting per user
- [ ] Transaction scheduling
- [ ] Multi-signature authorization
- [ ] Compliance reporting
- [ ] Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@fintech.com or open an issue on GitHub.

## Authors

- **Qoseem Oluwaphemy** - Initial development

## Acknowledgments

- Express.js community
- React community
- PostgreSQL documentation
- Kafka documentation
