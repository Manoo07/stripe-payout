```markdown
# Project Setup

## Steps to Run the Project Locally

### 1. Install Node Modules

Install all the required dependencies:

```bash
npm install
```

### 2. Add Environment Variables

Copy the provided `.env.example` file and rename it to `.env`:

```bash
cp .env.example .env
```


### 3. Run Prisma Migrations

Apply the Prisma migrations to create the necessary tables in the database:

```bash
npx prisma migrate dev
```

This will apply the migrations and generate the database schema based on your `schema.prisma` file.

### 4. Generate Prisma Client

Generate the Prisma Client to interact with the database:

```bash
npx prisma generate
```

### 5. Start the Server

To start the development server, run:

```bash
npm run dev
```

Your server will now be running locally.
```