// A fictional resume and job description, so someone trying the app can start without their own.
// The people and companies are invented. Keep the company unreal: a real one would send the role
// briefing off researching it.

export const SAMPLE_RESUME = `Priya Raman
Senior Backend Engineer
priya.raman@example.com · Bristol, UK

SUMMARY
Backend engineer with 7 years building payment and order-processing services in Go and Python. Comfortable owning a service end to end, from schema design to on-call. Most recently led the move of a monolithic billing system to event-driven services handling 40M transactions a month.

EXPERIENCE

Senior Backend Engineer, Larkfield Payments — 2021 to present
- Led a team of four splitting a Django billing monolith into Go services over Kafka; cut invoice generation time from 3 hours to 12 minutes.
- Designed an idempotent payment-retry service that reduced duplicate charges to zero and recovered £1.2M a year in failed payments.
- Introduced PostgreSQL logical replication and read replicas, bringing p95 API latency from 480ms to 90ms under peak load.
- Ran the on-call rota and wrote the incident review process; mean time to recovery fell from 70 to 25 minutes.
- Mentored three engineers to mid level; ran the backend interview loop.

Backend Engineer, Tidewater Logistics — 2018 to 2021
- Built the shipment-tracking API in Python (FastAPI) serving 2,000 requests per second to mobile and partner clients.
- Replaced nightly batch syncs with change-data-capture into Elasticsearch, so tracking pages were current within seconds.
- Containerised 14 services and moved them to Kubernetes on AWS (EKS) with Terraform; halved hosting costs.
- Added contract tests between services, which caught breaking API changes before release.
- Designed the webhook delivery system for partner carriers, with signed payloads, exponential backoff and a replay console for support staff.

Software Engineer, Brightmoor Studio — 2017 to 2018
- Wrote REST APIs in Node.js and PostgreSQL for client e-commerce sites.
- Set up the studio's first CI pipeline and automated database migrations.
- Integrated Stripe and PayPal checkouts for six retail clients, including refunds and webhook handling.

PROJECTS
- queuelens: an open-source CLI for inspecting Kafka consumer lag and replaying dead-letter messages (Go, 600 GitHub stars).
- Rate limiter talk: "Token buckets in production" at a local Go meetup, on building a distributed rate limiter on Redis.

SKILLS
Languages: Go, Python, SQL, TypeScript
Data: PostgreSQL, Redis, Kafka, Elasticsearch, DynamoDB
Infrastructure: AWS (EKS, RDS, SQS, Lambda), Kubernetes, Terraform, Docker
Practices: distributed systems design, observability (OpenTelemetry, Prometheus, Grafana), incident response, code review, mentoring

EDUCATION
BSc Computer Science, University of Leeds — 2017
AWS Certified Solutions Architect – Associate — 2022
`;

export const SAMPLE_JOB_DESCRIPTION = `Senior Backend Engineer — Payments Platform
Quillon Commerce · Remote (UK) or London hybrid

About us
Quillon Commerce runs checkout and payments for 3,000 independent online retailers. Our platform team keeps money moving reliably: authorisations, refunds, payouts and reconciliation, across several payment providers.

The role
We're looking for a senior backend engineer to join the Payments Platform team. You'll design and build the services that sit between our merchants and payment providers, and help us move from a handful of large services to smaller, event-driven ones without dropping a single transaction.

What you'll do
- Design, build and run backend services in Go that process millions of payments a month.
- Own the reliability of what you ship: monitoring, alerting, on-call and incident reviews.
- Lead technical design for new features such as multi-currency payouts and smarter payment retries.
- Work with product and finance to make reconciliation accurate and auditable.
- Mentor other engineers and raise the bar through code and design review.

What we're looking for
- 5+ years of backend engineering, including production experience with Go (or strong experience in a similar language and a willingness to learn Go).
- Solid relational database skills, ideally PostgreSQL: schema design, indexing, query tuning.
- Experience with event-driven systems and message queues such as Kafka or SQS.
- A good grasp of distributed-systems concerns: idempotency, retries, consistency and failure handling.
- Experience running services on a cloud platform (we use AWS) with infrastructure as code.
- Clear written communication and a habit of leaving systems better documented than you found them.

Nice to have
- Payments, fintech or other regulated-industry experience (PCI DSS, strong customer authentication).
- Kubernetes and Terraform.
- Observability tooling such as OpenTelemetry, Prometheus or Grafana.
- Experience leading a small team or a cross-team project.

Our interview process
A short call with the hiring manager, a practical system design conversation, a code review exercise, and a values interview with two future teammates.
`;
