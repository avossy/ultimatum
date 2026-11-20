DROP TABLE IF EXISTS reviews, users, status_history, request_parts, repair_requests,
                     spare_parts, masters, statuses, warranties,
                     devices, clients CASCADE;

CREATE TABLE clients
(
    client_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE,
    address VARCHAR(250),
    registration_date DATE NOT NULL
        DEFAULT CURRENT_DATE
);

CREATE TABLE devices
(
    device_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id BIGINT NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(60) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    purchase_date DATE,
    CONSTRAINT fk_devices_client
        FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE
);

CREATE TABLE warranties
(
    warranty_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id BIGINT NOT NULL,
    warranty_type VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT uq_warranties_id_device
        UNIQUE (warranty_id, device_id),
    CONSTRAINT fk_warranties_device
        FOREIGN KEY (device_id)
        REFERENCES devices(device_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_warranties_type
        CHECK (warranty_type IN ('виробника', 'сервісного центру')),
    CONSTRAINT chk_warranties_dates
        CHECK (end_date >= start_date)
);

CREATE TABLE masters
(
    master_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    is_active SMALLINT NOT NULL
        DEFAULT 1,
    CONSTRAINT chk_masters_is_active
        CHECK (is_active IN (0, 1))
);

CREATE TABLE users
(
    user_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL,
    client_id BIGINT,
    master_id BIGINT,
    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_client
        FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_users_master
        FOREIGN KEY (master_id)
        REFERENCES masters(master_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_users_role
        CHECK (role IN ('client', 'master', 'admin')),
    -- клієнт має лише client_id, майстер лише master_id, адмін — жодного з них
    CONSTRAINT chk_users_role_link
        CHECK (
            (role = 'client' AND client_id IS NOT NULL AND master_id IS NULL)
            OR (role = 'master' AND master_id IS NOT NULL AND client_id IS NULL)
            OR (role = 'admin' AND client_id IS NULL AND master_id IS NULL)
        )
);

CREATE TABLE statuses
(
    status_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(250)
);

CREATE TABLE spare_parts
(
    part_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    part_name VARCHAR(150) NOT NULL,
    part_number VARCHAR(60) NOT NULL UNIQUE,
    manufacturer VARCHAR(100),
    unit_price NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL,
    min_stock_level INTEGER NOT NULL
        DEFAULT 0,
    CONSTRAINT chk_spare_parts_price
        CHECK (unit_price >= 0),
    CONSTRAINT chk_spare_parts_stock
        CHECK (stock_quantity >= 0),
    CONSTRAINT chk_spare_parts_min_stock
        CHECK (min_stock_level >= 0)
);

CREATE TABLE repair_requests
(
    request_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id BIGINT NOT NULL,
    master_id BIGINT,
    status_id BIGINT NOT NULL,
    warranty_id BIGINT,
    acceptance_date DATE NOT NULL
        DEFAULT CURRENT_DATE,
    planned_completion_date DATE,
    actual_completion_date DATE,
    problem_description VARCHAR(1000) NOT NULL,
    priority VARCHAR(20) NOT NULL
        DEFAULT 'звичайний',
    work_cost NUMERIC(10, 2) NOT NULL
        DEFAULT 0,
    diagnosis_result VARCHAR(500),
    CONSTRAINT fk_repair_requests_device
        FOREIGN KEY (device_id)
        REFERENCES devices(device_id),
    CONSTRAINT fk_repair_requests_master
        FOREIGN KEY (master_id)
        REFERENCES masters(master_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_repair_requests_status
        FOREIGN KEY (status_id)
        REFERENCES statuses(status_id),
    CONSTRAINT fk_repair_requests_warranty
        FOREIGN KEY (warranty_id, device_id)
        REFERENCES warranties(warranty_id, device_id),
    CONSTRAINT chk_repair_requests_priority
        CHECK (priority IN ('низький', 'звичайний', 'високий', 'терміновий')),
    CONSTRAINT chk_repair_requests_work_cost
        CHECK (work_cost >= 0),
    CONSTRAINT chk_repair_requests_planned
        CHECK (planned_completion_date IS NULL
               OR planned_completion_date >= acceptance_date),
    CONSTRAINT chk_repair_requests_actual
        CHECK (actual_completion_date IS NULL
               OR actual_completion_date >= acceptance_date)
);

CREATE TABLE request_parts
(
    request_part_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL,
    part_id BIGINT NOT NULL,
    quantity_used INTEGER NOT NULL,
    fixed_price NUMERIC(10, 2) NOT NULL,
    CONSTRAINT uq_request_parts
        UNIQUE (request_id, part_id),
    CONSTRAINT fk_request_parts_request
        FOREIGN KEY (request_id)
        REFERENCES repair_requests(request_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_request_parts_part
        FOREIGN KEY (part_id)
        REFERENCES spare_parts(part_id),
    CONSTRAINT chk_request_parts_quantity
        CHECK (quantity_used > 0),
    CONSTRAINT chk_request_parts_price
        CHECK (fixed_price >= 0)
);

CREATE TABLE status_history
(
    history_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL,
    status_id BIGINT NOT NULL,
    masters_change_id BIGINT,
    change_date DATE NOT NULL
        DEFAULT CURRENT_DATE,
    change_comment VARCHAR(500),
    CONSTRAINT fk_status_history_request
        FOREIGN KEY (request_id)
        REFERENCES repair_requests(request_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_status_history_status
        FOREIGN KEY (status_id)
        REFERENCES statuses(status_id),
    CONSTRAINT fk_status_history_master
        FOREIGN KEY (masters_change_id)
        REFERENCES masters(master_id)
        ON DELETE SET NULL
);

CREATE TABLE reviews
(
    review_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id BIGINT NOT NULL,
    request_id BIGINT NOT NULL UNIQUE,
    rating SMALLINT NOT NULL,
    review_text VARCHAR(1000),
    created_date DATE NOT NULL
        DEFAULT CURRENT_DATE,
    CONSTRAINT fk_reviews_client
        FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reviews_request
        FOREIGN KEY (request_id)
        REFERENCES repair_requests(request_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_reviews_rating
        CHECK (rating BETWEEN 1 AND 5)
);

-- УВАГА: порядок створення в'юх виправлено відносно надісланого файлу —
-- v_repair_cost має існувати ДО v_active_repair_requests, бо та на неї посилається.

CREATE OR REPLACE VIEW v_repair_cost AS
SELECT r.request_id,
       r.work_cost,
       COALESCE(SUM(rp.quantity_used * rp.fixed_price), 0) AS parts_cost,
       r.work_cost + COALESCE(SUM(rp.quantity_used * rp.fixed_price), 0) AS total_cost
FROM repair_requests r
LEFT JOIN request_parts rp ON rp.request_id = r.request_id
GROUP BY r.request_id, r.work_cost;

CREATE OR REPLACE VIEW v_active_repair_requests AS
SELECT r.request_id,
       c.full_name                            AS client,
       c.phone                                AS client_phone,
       d.brand || ' ' || d.model              AS device,
       d.type                                 AS device_type,
       COALESCE(m.full_name, 'не призначено') AS master,
       s.status_name                          AS status,
       r.priority,
       r.acceptance_date,
       r.planned_completion_date,
       CURRENT_DATE - r.acceptance_date       AS days_in_work,
       r.diagnosis_result,
       v.total_cost
FROM repair_requests r
JOIN devices  d      ON d.device_id  = r.device_id
JOIN clients  c      ON c.client_id  = d.client_id
JOIN statuses s      ON s.status_id  = r.status_id
JOIN v_repair_cost v ON v.request_id = r.request_id
LEFT JOIN masters m  ON m.master_id  = r.master_id
WHERE s.status_name NOT IN ('готово', 'видано', 'скасовано');

