// src/types/trust.js

/**
 * @typedef {Object} TrustInvoice
 * @property {number} id
 * @property {number} organization_id
 * @property {number} customer_id
 * @property {number|null} property_id
 * @property {string} currency
 * @property {number} total_cents
 * @property {number} subtotal_cents
 * @property {string} status
 * @property {string|null} due_date
 * @property {string|null} effective_due_date
 * @property {string|null} period_start
 * @property {string|null} period_end
 * @property {string|null} completed_at
 * @property {string|null} recurrence_pattern
 * @property {string|null} recurrence_label
 * @property {number|null} recurrence_interval
 * @property {boolean|null} is_recurring
 * @property {number|null} schedule_rule_id
 * @property {string|null} source
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {Array<TrustItem>|undefined} [items] // some responses may embed items here
 * @property {Array<TrustMedia>|undefined} [photos] // mirrors invoice.photos in UI
 * @property {Record<string, any>} [extra]
 */

/**
 * @typedef {Object} TrustOrganization
 * @property {number} id
 * @property {string} name
 * @property {string|null} [legal_name]
 * @property {string|null} [logo_url]
 * @property {string|null} [website_url]
 * @property {string|null} [phone]
 * @property {string|null} [email]
 * @property {string|null} [timezone]
 */

/**
 * @typedef {Object} TrustCustomer
 * @property {number} id
 * @property {number} organization_id
 * @property {string} name
 * @property {string|null} [email]
 * @property {string|null} [phone]
 * @property {string|null} [phone_number]
 * @property {string|null} [street]
 * @property {string|null} [city]
 * @property {string|null} [state]
 * @property {string|null} [zip]
 */

/**
 * @typedef {Object} TrustGeolocation
 * @property {number} lat
 * @property {number} lng
 * @property {number} [accuracy_m]
 */

/**
 * @typedef {Object} TrustProperty
 * @property {number} id
 * @property {number} organization_id
 * @property {string} normalized_address
 * @property {string|null} [raw_address_input]
 * @property {string|null} [parcel_id]
 * @property {string|null} [mls_id]
 * @property {TrustGeolocation|null} [geolocation]
 */

/**
 * @typedef {Object} TrustItem
 * @property {number|string} id
 * @property {string} description
 * @property {number} quantity
 * @property {number} unit_price_cents
 * @property {number} total_cents
 * @property {string|undefined} [service_key]
 * @property {Record<string, any>|null} [meta]
 */

/**
 * @typedef {Object} TrustPayment
 * @property {string|number} id
 * @property {number} amount_cents
 * @property {string} currency
 * @property {string} status
 * @property {string} processed_at
 * @property {Record<string, any>|null} [meta]
 */

/**
 * @typedef {Object} TrustPaymentSummary
 * @property {number} invoice_id
 * @property {string} currency
 * @property {number} total_cents
 * @property {number} paid_cents
 * @property {number} refunded_cents
 * @property {number} balance_cents
 * @property {string} status
 * @property {TrustPayment[]} payments
 */

/**
 * @typedef {Object} TrustServiceRecord
 * @property {number|string} service_record_id
 * @property {number} organization_id
 * @property {number} invoice_id
 * @property {number} customer_id
 * @property {number|null} property_id
 * @property {number|null} job_id
 * @property {string|null} scheduled_at
 * @property {string|null} started_at
 * @property {string|null} completed_at
 * @property {(number|string)[]} crew_ids
 * @property {string|null} notes
 * @property {TrustGeolocation|null} geo_location
 * @property {Record<string, any>|null} device_metadata
 * @property {string} status
 * @property {string|null} finalized_at
 * @property {number|null} finalized_by_user_id
 */

/**
 * @typedef {Object} TrustMediaHash
 * @property {string} algorithm
 * @property {string} hash_hex
 * @property {string} created_at
 */

/**
 * @typedef {Object} TrustMedia
 * @property {number|string} id
 * @property {number} organization_id
 * @property {number} invoice_id
 * @property {number|null} service_record_id
 * @property {number|null} customer_id
 * @property {number|null} property_id
 * @property {number|null} job_id
 * @property {string|null} storage_key
 * @property {string|null} key
 * @property {string|null} public_url
 * @property {string|null} url
 * @property {string} content_type
 * @property {number} bytes
 * @property {string} created_at
 * @property {TrustMediaHash[]} hashes
 * @property {TrustMediaHash[]} [media_hashes] // alias sometimes returned by backend
 * @property {string[]} labels
 */

/**
 * @typedef {Object} TrustChain
 * @property {string} trust_hash
 * @property {string|null} prev_trust_hash
 * @property {number} height
 */

/**
 * @typedef {Object} TrustMeta
 * @property {string} version
 * @property {string} generated_at
 * @property {string} environment
 */

/**
 * @typedef {Object} TrustObject
 * @property {TrustInvoice} invoice
 * @property {TrustOrganization} organization
 * @property {TrustCustomer} customer
 * @property {TrustProperty|null} [property]
 * @property {TrustItem[]} items
 * @property {TrustPaymentSummary} paymentSummary
 * @property {TrustPaymentSummary|undefined} [payment_summary] // legacy snake_case
 * @property {TrustServiceRecord|null} serviceRecord
 * @property {TrustServiceRecord|null|undefined} [service_record] // legacy snake_case
 * @property {TrustMedia[]} media
 * @property {TrustChain|null|undefined} [chain]
 * @property {TrustMeta} meta
 * @property {number|undefined} [invoice_id] // echoed ids for convenience
 * @property {number|undefined} [organization_id]
 * @property {number|undefined} [customer_id]
 */
