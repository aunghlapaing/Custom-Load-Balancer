# GoLoadBalancerApplication

A modern load balancer and management dashboard built with Go backend and React frontend. Features include advanced load balancing algorithms, real-time health checks, and a responsive management interface.

## Project Structure

- `backend/` — Go backend (load balancer, management API, health checks, etc.)
- `frontend/` — React dashboard (management UI, metrics, charts)
- `Makefile` — Common build, test, and run commands

## Local Development Setup

1. **Clone the repo:**
   ```sh
   git clone <repo-url>
   cd GoLoadBalancerApplication
   ```
2. **Copy and edit environment variables:**
   ```sh
   cp .env.example .env
   # Edit .env as needed
   ```
3. **Install dependencies:**
   - **Go:** Install Go 1.21+
   - **Node.js:** Install Node.js 18+ and npm
   - **Frontend:**
     ```sh
     cd frontend
     npm install
     ```
4. **Run the backend:**
   ```sh
   ./bin/loadbalancer
   ```
5. **Run the frontend:**
   ```sh
   cd frontend
   npm run dev
   ```
6. **Access services:**
   - Load balancer: http://localhost
   - Management API: http://localhost:8081/api/v1
   - Frontend dashboard: http://localhost:3000

## Makefile Commands

- `make build-all` — Build backend and frontend
- `make backend-build` — Build Go backend
- `make frontend-build` — Build React frontend
- `make run-frontend-dev` — Start frontend dev server (hot reload)
- `make test-all` — Run all backend and frontend tests
- `make backend-test` — Run Go tests
- `make frontend-test` — Run frontend tests
- `make clean-all` — Clean backend and frontend build artifacts

## Usage Examples

- **Add a backend server:**
  - Use the dashboard UI or POST to `/api/v1/servers` with JSON:
    ```json
    {
      "id": "server1",
      "url": "http://backend1:9001",
      "weight": 1
    }
    ```
- **Monitor system:**
  - Use the frontend dashboard for real-time metrics and monitoring
- **Access the dashboard:**
  - Open http://localhost:3000 (if running frontend dev server)

## API Documentation

- Management API: `/api/v1/`
- Example endpoints:
  - `GET /api/v1/servers` — List backend servers
  - `POST /api/v1/servers` — Add a server
  - `PUT /api/v1/servers/{id}` — Update a server
  - `DELETE /api/v1/servers/{id}` — Remove a server
  - `GET /api/v1/status` — System status and health
  - `GET /api/v1/logs` — Recent activity logs
- (If you generate OpenAPI/Swagger docs, link here: `backend/api/openapi/swagger.yaml`)
