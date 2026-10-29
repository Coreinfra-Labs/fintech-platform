# API Documentation

The API Gateway runs on port `3000`. All routes below require a bearer token
except `POST /api/auth/login`, `POST /api/auth/register`, and
`POST /api/auth/verify-token`. Ledger endpoints are not proxied by the gateway;
call the Ledger Service directly on port `3008`.

## Authentication Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "kycStatus": "pending"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "08012345678"
}
```

Registration returns `201` with a `user` object and JWT. Token verification is
available at `POST /api/auth/verify-token` with `{ "token": "<token>" }`.

## Wallet Endpoints

### Get User Wallets
```http
GET /api/wallet/user/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "wallets": [
    {
      "id": "uuid",
      "accountNumber": "0001234567",
      "accountType": "SAVINGS",
      "balance": "100000.00",
      "currency": "NGN",
      "availableBalance": "100000.00",
      "isPrimary": true
    }
  ]
}
```

### Create Wallet
```http
POST /api/wallet/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "accountType": "SAVINGS"
}
```

The gateway requires a bearer token for wallet routes. Wallet creation requires
the `userId` in the request body.

`GET /api/wallet/:walletId` returns a single wallet.

## Transaction Endpoints

### Create Transaction
```http
POST /api/transaction/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceWalletId": "uuid",
  "destinationWalletId": "uuid",
  "amount": 50000,
  "type": "TRANSFER",
  "description": "Payment for services",
  "idempotencyKey": "unique-key-12345"
}
```

### Get Transaction
```http
GET /api/transaction/:transactionId
Authorization: Bearer <token>
```

### List Transactions for a Wallet

```http
GET /api/transaction/wallet/:walletId
Authorization: Bearer <token>
```

The route returns at most 50 transactions. It does not currently accept
pagination parameters.

## Payment Endpoints

### Bank Transfer
```http
POST /api/payment/bank-transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceWalletId": "uuid",
  "destinationAccountNumber": "0009876543",
  "destinationBankCode": "009",
  "amount": 50000,
  "description": "Payment",
  "idempotencyKey": "unique-key"
}
```

### Validate Account
```http
POST /api/payment/validate-account
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountNumber": "0001234567",
  "bankCode": "001"
}
```

## Fraud Endpoints

### Check Transaction for Fraud
```http
POST /api/fraud/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "transactionId": "uuid",
  "amount": 500000,
  "transactionType": "TRANSFER"
}
```

`GET /api/fraud/alerts/:userId` returns the user's latest fraud alerts (up to
50).

**Response:**
```json
{
  "isRiskyTransaction": true,
  "riskScore": 65,
  "alerts": ["HIGH_AMOUNT", "UNUSUAL_TIME"]
}
```

## Notification Endpoints

```http
POST /api/notification/email
Authorization: Bearer <token>
Content-Type: application/json

{"to":"user@example.com","subject":"Notice","template":"transaction_completed","data":{}}
```

```http
POST /api/notification/sms
Authorization: Bearer <token>
Content-Type: application/json

{"to":"+1234567890","message":"Your notification"}
```

## Ledger Service Endpoints

These are called directly at `http://localhost:3008`; the API Gateway does not
currently register a `/api/ledger` proxy route.

```http
POST /api/ledger/record
POST /api/ledger/validate
GET /api/ledger/entries/:transactionId
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP by default (`RATE_LIMIT` can override it)
- **Status**: 429 when exceeded

## Response Status Codes

| Code | Meaning |
|------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
