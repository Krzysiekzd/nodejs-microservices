# nodejs-microservices

### 🧠 Project Idea: **Order & Inventory System (E-commerce-inspired)**

This system is common in companies and is **divided by responsibility**, making it great for microservices.

---

### 📦 Microservices Architecture

| Microservice             | Tech Stack                           | DB         | Responsibility                                    |
| ------------------------ | ------------------------------------ | ---------- | ------------------------------------------------- |
| **User Service**         | NestJS                               | PostgreSQL | Register/Login users, store profiles, auth tokens |
| **Product Service**      | ExpressJS                            | MongoDB    | Manage products: create, update, list, delete     |
| **Order Service**        | NestJS                               | PostgreSQL | Handle order creation, validation, and processing |
| **Inventory Service**    | ExpressJS                            | MongoDB    | Track product stock, decrease on purchase         |
| **Notification Service** | ExpressJS                            | MongoDB    | Send emails or logs to console for now            |
| **API Gateway**          | ExpressJS (or NestJS Gateway module) | -          | Routes and proxies external traffic to services   |
| **Message Broker**       | (e.g. NATS or RabbitMQ)              | -          | Event-driven communication between services       |

---

### 🗂️ Folder Structure (High-level)

```bash
nodejs-microservices/
├── api-gateway/              # Express or NestJS Gateway
├── user-service/             # NestJS + PostgreSQL
├── product-service/          # Express + MongoDB
├── order-service/            # NestJS + PostgreSQL
├── inventory-service/        # Express + MongoDB
├── notification-service/     # Express + MongoDB (simple)
├── docker-compose.yml        # All infra (DBs, services)
├── README.md
```

---

### ⚙️ Communication Strategy

* Use **REST between Gateway and Services**
* Use **Events (via message broker)** between services like:

  * `OrderService` emits `order_created`
  * `InventoryService` listens and updates stock
  * `NotificationService` sends an email/log

---

### 🧪 Features per Service

#### 🔐 `user-service` (NestJS + PostgreSQL)

* Sign up / Login
* JWT Authentication
* Roles (admin, user)

#### 📦 `product-service` (ExpressJS + MongoDB)

* Create / List / Delete products
* Fetch product by ID
* Store simple document schema

#### 🛒 `order-service` (NestJS + PostgreSQL)

* Place Order
* Validate user & product availability
* Emit event `order_created`

#### 🏬 `inventory-service` (ExpressJS + MongoDB)

* Listen to `order_created`
* Decrease stock
* Reject order if stock not enough

#### 🔔 `notification-service` (ExpressJS + MongoDB)

* Listen to `order_created` or `order_confirmed`
* Log or simulate email sending

#### 🌐 `api-gateway` (ExpressJS or NestJS)

* Single entrypoint for frontend
* Reverse proxy + token verification
* Route `/products`, `/orders`, `/users` to respective services

---

### 🐳 Docker Setup

Your `docker-compose.yml` should manage:

* All services (using build context)
* MongoDB + PostgreSQL containers
* RabbitMQ or NATS as message broker
* Admin UI (optional): pgAdmin, Mongo Express, RabbitMQ dashboard
