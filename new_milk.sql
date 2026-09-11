-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 09, 2026 at 03:17 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `new_milk`
--

-- --------------------------------------------------------

--
-- Table structure for table `administration_requests`
--

CREATE TABLE `administration_requests` (
  `id` int(11) NOT NULL,
  `request_id` varchar(100) NOT NULL,
  `requested_by` varchar(100) NOT NULL,
  `request_type` varchar(50) NOT NULL,
  `details` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `animals`
--

CREATE TABLE `animals` (
  `id` int(11) NOT NULL,
  `animal_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `tag_number` varchar(100) NOT NULL,
  `breed` varchar(100) DEFAULT NULL,
  `sex` varchar(20) NOT NULL DEFAULT 'FEMALE',
  `date_of_birth` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `registration_batch_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `animals`
--

INSERT INTO `animals` (`id`, `animal_id`, `farmer_id`, `tag_number`, `breed`, `sex`, `date_of_birth`, `status`, `created_at`, `registration_batch_id`) VALUES
(64, 'A-1788894362810-0', 'F-1788892297377', '3000', 'Ankole', 'FEMALE', NULL, 'ACTIVE', '2026-09-08 19:07:13', 'COW-BATCH-1788894407811'),
(65, 'A-1788894381020-1', 'F-1788892297377', '4000', 'Ankole', 'FEMALE', NULL, 'ACTIVE', '2026-09-08 19:07:13', 'COW-BATCH-1788894407811'),
(66, 'A-1788894404888-2', 'F-1788892297377', '4100', 'Friesian', 'FEMALE', NULL, 'ACTIVE', '2026-09-08 19:07:13', 'COW-BATCH-1788894407811'),
(67, 'A-1788946728037-1', 'F-1788946534258', '5000', 'Ankole', 'FEMALE', NULL, 'ACTIVE', '2026-09-09 09:42:11', 'COW-BATCH-1788946812649'),
(68, 'A-1788946758644-2', 'F-1788946534258', '7000', 'Ayrshire', 'FEMALE', NULL, 'ACTIVE', '2026-09-09 09:42:11', 'COW-BATCH-1788946812649'),
(69, 'A-1788946808677-2', 'F-1788946534258', '10000', 'Ankole', 'FEMALE', NULL, 'ACTIVE', '2026-09-09 09:42:11', 'COW-BATCH-1788946812649');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `audit_id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `audit_id`, `user_id`, `action`, `module`, `entity_type`, `entity_id`, `description`, `timestamp`) VALUES
(1, 'audit-1', 'admin-1', 'LOGIN', 'auth', 'user', 'admin-1', 'System administrator logged in successfully.', '0000-00-00 00:00:00'),
(2, 'audit-2', 'admin-1', 'MCC_CREATED', 'mcc', 'mccCenter', 'MCC-001', 'MCC-001 was created in the system.', '0000-00-00 00:00:00'),
(5, 'audit-1788892298455', 'collector-1', 'FARMER_CREATED', 'farmers', 'farmer', 'F-1788892297377', 'HITAYEZU was registered.', '0000-00-00 00:00:00'),
(18, 'audit-1788892938312', 'admin-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788892938198', 'A 10-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(19, 'audit-1788892970543', 'admin-1', 'COW_REGISTRATION_BATCH_REGISTERED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788892938198', '10 cows were registered after successful farmer OTP authorization.', '0000-00-00 00:00:00'),
(20, 'audit-1788892984489', 'admin-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788892984437', 'A 50-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(21, 'audit-1788892984844', 'admin-1', 'COW_REGISTRATION_BATCH_REGISTERED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788892984437', '50 cows were registered after successful farmer OTP authorization.', '0000-00-00 00:00:00'),
(22, 'audit-1788893041188', 'admin-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788893041128', 'A 1-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(23, 'audit-1788893041272', 'admin-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788893041263', 'A 1-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(24, 'audit-1788893057019', 'admin-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788893057005', 'A 1-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(25, 'audit-1788893057906', 'admin-1', 'COW_REGISTRATION_BATCH_REGISTERED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788893057005', '1 cows were registered after successful farmer OTP authorization.', '0000-00-00 00:00:00'),
(26, 'audit-1788893308048', 'admin-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788893307990', 'A 1-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(27, 'audit-1788894407910', 'collector-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788894407811', 'A 3-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(28, 'audit-1788894433424', 'collector-1', 'COW_REGISTRATION_BATCH_REGISTERED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788894407811', '3 cows were registered after successful farmer OTP authorization.', '0000-00-00 00:00:00'),
(29, 'audit-1788894927569', 'admin-1', 'MCC_UPDATED', 'mcc', 'mccCenter', 'MCC-001', 'MCC details updated by System Administrator.', '0000-00-00 00:00:00'),
(30, 'audit-1788937395812', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788937394685', '400 litres were recorded.', '0000-00-00 00:00:00'),
(31, 'audit-1788937446224', 'collector-1', 'MILK_BATCH_CREATED', 'batches', 'milkBatch', 'BATCH-1788937445251', '400 litres were assigned to a batch.', '0000-00-00 00:00:00'),
(32, 'audit-1788938087519', 'vet-1', 'VETERINARY_RECORD_CREATED', 'veterinary', 'veterinaryRecord', 'VET-1788938086442', 'Faver was recorded.', '0000-00-00 00:00:00'),
(33, 'audit-1788938580180', 'vet-1', 'VETERINARY_RECORD_DATES_UPDATED', 'veterinary', 'veterinaryRecord', 'VET-1788938086442', 'Veterinary treatment dates were updated.', '0000-00-00 00:00:00'),
(34, 'audit-1788938583020', 'vet-1', 'VETERINARY_RECORD_CLEARED', 'veterinary', 'veterinaryRecord', 'VET-1788938086442', 'Cow was cleared for milk collection.', '0000-00-00 00:00:00'),
(35, 'audit-1788943559455', 'vet-1', 'VETERINARY_RECORD_CREATED', 'veterinary', 'veterinaryRecord', 'VET-1788943558546', 'Diarrhea was recorded.', '0000-00-00 00:00:00'),
(36, 'audit-1788946559054', 'collector-1', 'FARMER_CREATED', 'farmers', 'farmer', 'F-1788946534258', 'NISHIMWE was registered.', '0000-00-00 00:00:00'),
(37, 'audit-1788946812691', 'collector-1', 'COW_REGISTRATION_AUTHORIZATION_REQUESTED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788946812649', 'A 3-cow registration batch was sent to the farmer for OTP authorization.', '0000-00-00 00:00:00'),
(38, 'audit-1788946931054', 'collector-1', 'COW_REGISTRATION_BATCH_REGISTERED', 'animals', 'cowRegistrationBatch', 'COW-BATCH-1788946812649', '3 cows were registered after successful farmer OTP authorization.', '0000-00-00 00:00:00'),
(39, 'audit-1788947359263', 'vet-1', 'VETERINARY_RECORD_CREATED', 'veterinary', 'veterinaryRecord', 'VET-1788947358166', 'Ifumbi was recorded.', '0000-00-00 00:00:00'),
(40, 'audit-1788947523239', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788947522431', '1000 litres were recorded.', '0000-00-00 00:00:00'),
(41, 'audit-1788947659047', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788947658157', '400 litres were recorded.', '0000-00-00 00:00:00'),
(42, 'audit-1788948868682', 'collector-1', 'MILK_BATCH_CREATED', 'batches', 'milkBatch', 'BATCH-1788948867275', '1400 litres were assigned to a batch.', '0000-00-00 00:00:00'),
(43, 'audit-1788950936019', 'officer-1', 'COLLECTOR_PAYMENT_PAID', 'accounting', 'collectorPayment', 'COLLECTOR-PAY-collector-1-2026-09-09', 'Collector payment for UMUHOZA Fabiola was marked Paid.', '0000-00-00 00:00:00'),
(73, 'audit-1788955621381', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788955620062', '100 litres were recorded.', '2026-09-09 10:07:01'),
(74, 'audit-1788955644002', 'collector-1', 'MILK_BATCH_CREATED', 'batches', 'milkBatch', 'BATCH-01-UF-1788955642820', '100 litres were assigned to a batch.', '2026-09-09 10:07:24'),
(75, 'audit-1788958645202', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788958644265', '100 litres were recorded.', '2026-09-09 10:57:25'),
(76, 'audit-1788958663549', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788958662477', '200 litres were recorded.', '2026-09-09 10:57:43'),
(77, 'audit-1788958718314', 'collector-1', 'MILK_BATCH_CREATED', 'batches', 'milkBatch', 'BATCH-01-UF', '300 litres were assigned to a batch.', '2026-09-09 10:58:38'),
(78, 'audit-1788958828002', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788958827166', '300 litres were recorded.', '2026-09-09 11:00:28'),
(79, 'audit-1788958841580', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788958840569', '400 litres were recorded.', '2026-09-09 11:00:41'),
(80, 'audit-1788958880564', 'collector-1', 'MILK_BATCH_CREATED', 'batches', 'milkBatch', 'BATCH-02-UF', '700 litres were assigned to a batch.', '2026-09-09 11:01:20'),
(81, 'audit-1788958945362', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788958944501', '200 litres were recorded.', '2026-09-09 11:02:25'),
(82, 'audit-1788958965486', 'collector-1', 'MILK_COLLECTED', 'collections', 'milkCollection', 'COL-1788958964657', '450 litres were recorded.', '2026-09-09 11:02:45'),
(83, 'audit-1788958973346', 'collector-1', 'MILK_BATCH_CREATED', 'batches', 'milkBatch', 'BATCH-03-UF', '650 litres were assigned to a batch.', '2026-09-09 11:02:53');

-- --------------------------------------------------------

--
-- Table structure for table `breed_types`
--

CREATE TABLE `breed_types` (
  `id` int(11) NOT NULL,
  `breed_name` varchar(100) NOT NULL,
  `created_by` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `breed_types`
--

INSERT INTO `breed_types` (`id`, `breed_name`, `created_by`, `status`, `created_at`) VALUES
(1, 'Friesian', 'system', 'ACTIVE', '2026-09-08 18:47:17'),
(2, 'Jersey', 'system', 'ACTIVE', '2026-09-08 18:47:17'),
(3, 'Ayrshire', 'system', 'ACTIVE', '2026-09-08 18:47:17'),
(4, 'Ankole', 'system', 'ACTIVE', '2026-09-08 18:47:17');

-- --------------------------------------------------------

--
-- Table structure for table `collector_batch_assignments`
--

CREATE TABLE `collector_batch_assignments` (
  `id` int(11) NOT NULL,
  `assignment_id` varchar(100) NOT NULL,
  `collector_id` varchar(100) NOT NULL,
  `mcc_id` varchar(50) NOT NULL,
  `batch_code` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `assigned_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `collector_batch_assignments`
--

INSERT INTO `collector_batch_assignments` (`id`, `assignment_id`, `collector_id`, `mcc_id`, `batch_code`, `status`, `assigned_by`, `created_at`) VALUES
(1, 'ASSIGN-1788955004891', 'collector-1', 'MCC-001', 'BATCH-01-UF', 'ACTIVE', 'manager-1', '2026-09-09 11:56:44'),
(2, 'ASSIGN-1788955289123', 'collector-1', 'MCC-001', 'BATCH-02-UF', 'ACTIVE', 'manager-1', '2026-09-09 12:01:29'),
(3, 'ASSIGN-1788955293399', 'collector-1', 'MCC-001', 'BATCH-03-UF', 'ACTIVE', 'manager-1', '2026-09-09 12:01:33');

-- --------------------------------------------------------

--
-- Table structure for table `collector_payments`
--

CREATE TABLE `collector_payments` (
  `id` int(11) NOT NULL,
  `payment_id` varchar(100) NOT NULL,
  `collector_id` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `litres` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `paid_at` datetime DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `collector_payments`
--

INSERT INTO `collector_payments` (`id`, `payment_id`, `collector_id`, `period_start`, `period_end`, `litres`, `amount`, `status`, `paid_at`, `approved_by`, `created_at`) VALUES
(1, 'COLLECTOR-PAY-collector-1-2026-09-09', 'collector-1', '2026-09-01', '2026-09-09', 400.00, 12400.00, 'PAID', '2026-09-09 12:48:56', 'officer-1', '2026-09-09 10:48:56');

-- --------------------------------------------------------

--
-- Table structure for table `cow_registration_authorizations`
--

CREATE TABLE `cow_registration_authorizations` (
  `id` int(11) NOT NULL,
  `authorization_session_id` varchar(100) NOT NULL,
  `batch_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `otp_hash` char(64) NOT NULL,
  `otp_code` char(6) NOT NULL,
  `created_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  `failed_attempts` int(11) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cow_registration_authorizations`
--

INSERT INTO `cow_registration_authorizations` (`id`, `authorization_session_id`, `batch_id`, `farmer_id`, `otp_hash`, `otp_code`, `created_at`, `expires_at`, `verified_at`, `used_at`, `failed_attempts`, `status`) VALUES
(7, 'AUTH-SESSION-1788894407846-9723', 'COW-BATCH-1788894407811', 'F-1788892297377', '283e9a73603d2b8055450e4de194349e0bc2895fae88c1bcf239a4595bd845d4', '244791', '2026-09-08 21:06:47', '2026-09-08 21:16:47', '2026-09-08 21:07:13', '2026-09-08 21:07:13', 0, 'USED'),
(8, 'AUTH-SESSION-1788946812668-5781', 'COW-BATCH-1788946812649', 'F-1788946534258', '427a9ac60963ef9abfefeac6dccd01395755169692a8378605a1b3f08d48e810', '833622', '2026-09-09 11:40:12', '2026-09-09 11:50:12', '2026-09-09 11:42:11', '2026-09-09 11:42:11', 0, 'USED');

-- --------------------------------------------------------

--
-- Table structure for table `cow_registration_batches`
--

CREATE TABLE `cow_registration_batches` (
  `id` int(11) NOT NULL,
  `batch_id` varchar(100) NOT NULL,
  `authorization_session_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `requested_by` varchar(100) NOT NULL,
  `cow_count` int(11) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `authorized_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cow_registration_batches`
--

INSERT INTO `cow_registration_batches` (`id`, `batch_id`, `authorization_session_id`, `farmer_id`, `requested_by`, `cow_count`, `status`, `created_at`, `expires_at`, `authorized_at`) VALUES
(7, 'COW-BATCH-1788894407811', 'AUTH-SESSION-1788894407846-9723', 'F-1788892297377', 'collector-1', 3, 'REGISTERED', '2026-09-08 21:06:47', '2026-09-08 21:16:47', '2026-09-08 21:07:13'),
(8, 'COW-BATCH-1788946812649', 'AUTH-SESSION-1788946812668-5781', 'F-1788946534258', 'collector-1', 3, 'REGISTERED', '2026-09-09 11:40:12', '2026-09-09 11:50:12', '2026-09-09 11:42:11');

-- --------------------------------------------------------

--
-- Table structure for table `cow_registration_batch_cows`
--

CREATE TABLE `cow_registration_batch_cows` (
  `id` int(11) NOT NULL,
  `batch_id` varchar(100) NOT NULL,
  `animal_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `tag_number` varchar(100) NOT NULL,
  `breed` varchar(100) NOT NULL,
  `sex` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cow_registration_batch_items`
--

CREATE TABLE `cow_registration_batch_items` (
  `id` int(11) NOT NULL,
  `batch_id` varchar(100) NOT NULL,
  `animal_id` varchar(100) NOT NULL,
  `tag_number` varchar(100) NOT NULL,
  `breed` varchar(100) NOT NULL,
  `sex` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cow_registration_batch_items`
--

INSERT INTO `cow_registration_batch_items` (`id`, `batch_id`, `animal_id`, `tag_number`, `breed`, `sex`) VALUES
(65, 'COW-BATCH-1788894407811', 'A-1788894362810-0', '3000', 'Ankole', 'FEMALE'),
(66, 'COW-BATCH-1788894407811', 'A-1788894381020-1', '4000', 'Ankole', 'FEMALE'),
(67, 'COW-BATCH-1788894407811', 'A-1788894404888-2', '4100', 'Friesian', 'FEMALE'),
(68, 'COW-BATCH-1788946812649', 'A-1788946728037-1', '5000', 'Ankole', 'FEMALE'),
(69, 'COW-BATCH-1788946812649', 'A-1788946758644-2', '7000', 'Ayrshire', 'FEMALE'),
(70, 'COW-BATCH-1788946812649', 'A-1788946808677-2', '10000', 'Ankole', 'FEMALE');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `expense_id` varchar(100) NOT NULL,
  `expense_date` date NOT NULL,
  `expense_name` varchar(255) NOT NULL,
  `expense_type` varchar(100) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `recorded_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expense_types`
--

CREATE TABLE `expense_types` (
  `id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farmers`
--

CREATE TABLE `farmers` (
  `id` int(11) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `registered_by` varchar(100) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `national_id` varchar(100) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `sector` varchar(255) DEFAULT NULL,
  `village` varchar(255) DEFAULT NULL,
  `mcc_id` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `cell` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `farmers`
--

INSERT INTO `farmers` (`id`, `farmer_id`, `user_id`, `registered_by`, `full_name`, `national_id`, `phone`, `email`, `district`, `sector`, `village`, `mcc_id`, `status`, `created_at`, `updated_at`, `cell`) VALUES
(1, 'FARMER-001', 'farmer-1', NULL, 'Demo Farmer', 'DEMO-001', '+250788000010', NULL, NULL, NULL, NULL, 'MCC-001', 'ACTIVE', '2026-09-08 17:27:41', NULL, NULL),
(2, 'F-1788892297377', 'farmer-1788892298420', 'collector-1', 'HITAYEZU', '1199580053', '0789184911', 'hitayezu@milk.local', 'Musanze', 'Musanze', 'Rugeyo', 'MCC-001', 'ACTIVE', '2026-09-08 18:31:38', NULL, 'Cyabagarura'),
(6, 'F-1788946534258', 'farmer-1788946559011', 'collector-1', 'NISHIMWE', '19957987', '0785797398', 'nishimwe@milk.local', 'Musanze', 'Muhoza', 'Ruhengeri', 'MCC-001', 'ACTIVE', '2026-09-09 09:35:59', NULL, 'Ruhengeri');

-- --------------------------------------------------------

--
-- Table structure for table `farmer_payments`
--

CREATE TABLE `farmer_payments` (
  `id` int(11) NOT NULL,
  `payment_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `litres` decimal(10,2) NOT NULL DEFAULT 0.00,
  `rate_per_litre` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `paid_at` datetime DEFAULT NULL,
  `processed_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mccs`
--

CREATE TABLE `mccs` (
  `id` int(11) NOT NULL,
  `mcc_id` varchar(50) NOT NULL,
  `mcc_code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `sector` varchar(255) DEFAULT NULL,
  `cell` varchar(255) DEFAULT NULL,
  `village` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `manager_user_id` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mccs`
--

INSERT INTO `mccs` (`id`, `mcc_id`, `mcc_code`, `name`, `description`, `district`, `sector`, `cell`, `village`, `phone`, `email`, `manager_user_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'MCC-001', 'MCC-001', 'CYURU Milk Collection Center', 'Main collection center for cooperative operations', 'Gicumbi', 'Nyarugenge', 'Kigali City', 'Kimisagara', '+250788000001', 'mcc001@milk.local', 'manager-1', 'ACTIVE', '2026-09-08 17:27:40', '2026-09-09 11:42:32');

-- --------------------------------------------------------

--
-- Table structure for table `milk_batches`
--

CREATE TABLE `milk_batches` (
  `id` int(11) NOT NULL,
  `batch_id` varchar(100) NOT NULL,
  `mcc_id` varchar(50) NOT NULL,
  `batch_date` date NOT NULL,
  `total_litres` decimal(10,2) NOT NULL DEFAULT 0.00,
  `destination` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'OPEN',
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `collector_id` varchar(100) DEFAULT NULL,
  `parent_batch_code` varchar(100) DEFAULT NULL,
  `approval_comment` text DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `milk_batches`
--

INSERT INTO `milk_batches` (`id`, `batch_id`, `mcc_id`, `batch_date`, `total_litres`, `destination`, `status`, `created_by`, `created_at`, `collector_id`, `parent_batch_code`, `approval_comment`, `approved_by`, `approved_at`) VALUES
(1, 'BATCH-1788937445251', 'MCC-001', '2026-09-09', 400.00, '', 'ACCEPTED', 'collector-1', '2026-09-09 07:04:06', 'collector-1', 'BATCH-05-UF', NULL, NULL, NULL),
(2, 'BATCH-1788948867275', 'MCC-001', '2026-09-09', 1400.00, '', 'REJECTED', 'collector-1', '2026-09-09 10:14:28', 'collector-1', 'BATCH-05-UF', NULL, NULL, NULL),
(3, 'BATCH-01-UF-1788955642820', 'MCC-001', '2026-09-09', 100.00, '', 'ACCEPTED', 'collector-1', '2026-09-09 12:07:23', 'collector-1', 'BATCH-01-UF', NULL, NULL, NULL),
(4, 'BATCH-01-UF', 'MCC-001', '2026-09-09', 300.00, '', 'ACCEPTED', 'collector-1', '2026-09-09 12:58:38', 'collector-1', 'BATCH-01-UF', NULL, NULL, NULL),
(5, 'BATCH-02-UF', 'MCC-001', '2026-09-09', 700.00, '', 'REJECTED', 'collector-1', '2026-09-09 13:01:20', 'collector-1', 'BATCH-02-UF', NULL, NULL, NULL),
(6, 'BATCH-03-UF', 'MCC-001', '2026-09-09', 650.00, '', 'ACCEPTED', 'collector-1', '2026-09-09 13:02:53', 'collector-1', 'BATCH-03-UF', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `milk_batch_collections`
--

CREATE TABLE `milk_batch_collections` (
  `batch_id` varchar(100) NOT NULL,
  `collection_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `milk_batch_collections`
--

INSERT INTO `milk_batch_collections` (`batch_id`, `collection_id`) VALUES
('BATCH-01-UF', 'COL-1788958644265'),
('BATCH-01-UF', 'COL-1788958662477'),
('BATCH-01-UF-1788955642820', 'COL-1788955620062'),
('BATCH-02-UF', 'COL-1788958827166'),
('BATCH-02-UF', 'COL-1788958840569'),
('BATCH-03-UF', 'COL-1788958944501'),
('BATCH-03-UF', 'COL-1788958964657'),
('BATCH-1788937445251', 'COL-1788937394685'),
('BATCH-1788948867275', 'COL-1788947522431'),
('BATCH-1788948867275', 'COL-1788947658157');

-- --------------------------------------------------------

--
-- Table structure for table `milk_collections`
--

CREATE TABLE `milk_collections` (
  `id` int(11) NOT NULL,
  `collection_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `animal_id` varchar(100) DEFAULT NULL,
  `mcc_id` varchar(50) NOT NULL,
  `collection_date` datetime NOT NULL,
  `litres` decimal(10,2) NOT NULL,
  `fat_percentage` decimal(5,2) DEFAULT NULL,
  `temperature_c` decimal(5,2) DEFAULT NULL,
  `acceptance_status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `collector_acceptance_status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `mcc_acceptance_status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `mcc_comment` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `collected_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `collection_source` varchar(40) NOT NULL DEFAULT 'FARMER_COLLECTION_CHAIN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `milk_collections`
--

INSERT INTO `milk_collections` (`id`, `collection_id`, `farmer_id`, `animal_id`, `mcc_id`, `collection_date`, `litres`, `fat_percentage`, `temperature_c`, `acceptance_status`, `collector_acceptance_status`, `mcc_acceptance_status`, `mcc_comment`, `notes`, `collected_by`, `created_at`, `collection_source`) VALUES
(1, 'COL-1788937394685', 'F-1788892297377', 'A-1788894404888-2', 'MCC-001', '2026-09-09 07:03:14', 400.00, 50.00, 23.00, 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'Mukomereze aho.', NULL, 'collector-1', '2026-09-09 07:03:15', 'FARMER_COLLECTION_CHAIN'),
(2, 'COL-1788947522431', 'F-1788946534258', 'A-1788946808677-2', 'MCC-001', '2026-09-09 09:52:02', 1000.00, 0.00, 18.00, 'REJECTED', 'ACCEPTED', 'REJECTED', 'Mukomereze aho', NULL, 'collector-1', '2026-09-09 09:52:03', 'FARMER_COLLECTION_CHAIN'),
(3, 'COL-1788947658157', 'F-1788892297377', 'A-1788894381020-1', 'MCC-001', '2026-09-09 09:54:18', 400.00, 0.00, 18.00, 'REJECTED', 'ACCEPTED', 'REJECTED', 'Mukomereze aho', NULL, 'collector-1', '2026-09-09 09:54:19', 'FARMER_COLLECTION_CHAIN'),
(4, 'COL-1788955620062', 'F-1788946534258', 'A-1788946808677-2', 'MCC-001', '2026-09-09 12:07:00', 100.00, 1.00, 200.00, 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'Good', NULL, 'collector-1', '2026-09-09 12:07:01', 'FARMER_COLLECTION_CHAIN'),
(5, 'COL-1788958644265', 'F-1788946534258', 'A-1788946808677-2', 'MCC-001', '2026-09-09 12:57:24', 100.00, 0.00, 16.80, 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'Mukomereze aho.', NULL, 'collector-1', '2026-09-09 12:57:25', 'FARMER_COLLECTION_CHAIN'),
(6, 'COL-1788958662477', 'F-1788892297377', 'A-1788894404888-2', 'MCC-001', '2026-09-09 12:57:42', 200.00, 0.00, 18.00, 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'Mukomereze aho.', NULL, 'collector-1', '2026-09-09 12:57:43', 'FARMER_COLLECTION_CHAIN'),
(7, 'COL-1788958827166', 'F-1788892297377', 'A-1788894404888-2', 'MCC-001', '2026-09-09 13:00:27', 300.00, 0.00, 0.00, 'REJECTED', 'ACCEPTED', 'REJECTED', 'Mwisubireho amata yanyu ntabwo yuzjuje ubuziranenge', NULL, 'collector-1', '2026-09-09 13:00:27', 'FARMER_COLLECTION_CHAIN'),
(8, 'COL-1788958840569', 'F-1788946534258', 'A-1788946758644-2', 'MCC-001', '2026-09-09 13:00:40', 400.00, 0.00, 18.00, 'REJECTED', 'ACCEPTED', 'REJECTED', 'Mwisubireho amata yanyu ntabwo yuzjuje ubuziranenge', NULL, 'collector-1', '2026-09-09 13:00:41', 'FARMER_COLLECTION_CHAIN'),
(9, 'COL-1788958944501', 'F-1788946534258', 'A-1788946808677-2', 'MCC-001', '2026-09-09 13:02:24', 200.00, 0.00, 18.90, 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'Mukomereze aho.', NULL, 'collector-1', '2026-09-09 13:02:25', 'FARMER_COLLECTION_CHAIN'),
(10, 'COL-1788958964657', 'F-1788892297377', 'A-1788894404888-2', 'MCC-001', '2026-09-09 13:02:44', 450.00, 8.00, 12.00, 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'Mukomereze aho.', NULL, 'collector-1', '2026-09-09 13:02:45', 'FARMER_COLLECTION_CHAIN');

-- --------------------------------------------------------

--
-- Table structure for table `milk_collection_requests`
--

CREATE TABLE `milk_collection_requests` (
  `id` int(11) NOT NULL,
  `request_id` varchar(100) NOT NULL,
  `farmer_id` varchar(100) NOT NULL,
  `collector_id` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quality_tests`
--

CREATE TABLE `quality_tests` (
  `id` int(11) NOT NULL,
  `test_id` varchar(100) NOT NULL,
  `collection_id` varchar(100) NOT NULL,
  `acidity` decimal(5,2) DEFAULT NULL,
  `density` decimal(6,3) DEFAULT NULL,
  `adulteration_detected` tinyint(1) NOT NULL DEFAULT 0,
  `result` varchar(20) NOT NULL DEFAULT 'PENDING',
  `tested_by` varchar(100) NOT NULL,
  `tested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `organoleptic_result` varchar(10) DEFAULT NULL,
  `lactometer_reading` decimal(6,3) DEFAULT NULL,
  `alcohol_test_result` varchar(10) DEFAULT NULL,
  `comment` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quality_tests`
--

INSERT INTO `quality_tests` (`id`, `test_id`, `collection_id`, `acidity`, `density`, `adulteration_detected`, `result`, `tested_by`, `tested_at`, `organoleptic_result`, `lactometer_reading`, `alcohol_test_result`, `comment`) VALUES
(1, 'QT-1788937471858-COL-1788937394685', 'COL-1788937394685', 300.00, 100.000, 1, 'PASS', 'officer-1', '2026-09-09 07:04:32', NULL, NULL, NULL, NULL),
(2, 'QT-1788949117663-COL-1788947522431', 'COL-1788947522431', 10.00, 100.000, 1, 'FAIL', 'officer-1', '2026-09-09 10:18:39', 'PASS', 300.000, 'PASS', 'Mukomereze aho'),
(3, 'QT-1788949117663-COL-1788947658157', 'COL-1788947658157', 10.00, 100.000, 1, 'FAIL', 'officer-1', '2026-09-09 10:18:39', 'PASS', 300.000, 'PASS', 'Mukomereze aho'),
(4, 'QT-1788957717212-BATCH-01-UF-1788955642820-COL-1788955620062', 'COL-1788955620062', 10.00, 10.000, 0, 'PASS', 'officer-1', '2026-09-09 12:41:57', 'PASS', 23.000, 'PASS', 'Good'),
(5, 'QT-1788959025032-BATCH-02-UF-COL-1788958827166', 'COL-1788958827166', 30.00, 100.000, 1, 'FAIL', 'officer-1', '2026-09-09 13:03:45', 'FAIL', 30.000, 'FAIL', 'Mwisubireho amata yanyu ntabwo yuzjuje ubuziranenge'),
(6, 'QT-1788959025032-BATCH-02-UF-COL-1788958840569', 'COL-1788958840569', 30.00, 100.000, 1, 'FAIL', 'officer-1', '2026-09-09 13:03:45', 'FAIL', 30.000, 'FAIL', 'Mwisubireho amata yanyu ntabwo yuzjuje ubuziranenge'),
(7, 'QT-1788959049811-BATCH-03-UF-COL-1788958944501', 'COL-1788958944501', 30.00, 100.000, 0, 'PASS', 'officer-1', '2026-09-09 13:04:09', 'PASS', 30.000, 'PASS', 'Mukomereze aho.'),
(8, 'QT-1788959049811-BATCH-03-UF-COL-1788958964657', 'COL-1788958964657', 30.00, 100.000, 0, 'PASS', 'officer-1', '2026-09-09 13:04:09', 'PASS', 30.000, 'PASS', 'Mukomereze aho.'),
(9, 'QT-1788959049922-BATCH-01-UF-COL-1788958644265', 'COL-1788958644265', 30.00, 100.000, 0, 'PASS', 'officer-1', '2026-09-09 13:04:09', 'PASS', 30.000, 'PASS', 'Mukomereze aho.'),
(10, 'QT-1788959049922-BATCH-01-UF-COL-1788958662477', 'COL-1788958662477', 30.00, 100.000, 0, 'PASS', 'officer-1', '2026-09-09 13:04:09', 'PASS', 30.000, 'PASS', 'Mukomereze aho.');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `value_text` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `key_name`, `value_text`) VALUES
(1, 'projectName', 'Digital Milk Collection System'),
(2, 'milkPrice', '400'),
(3, 'mccSharePercent', '10'),
(4, 'collectorSharePercent', '5'),
(5, 'timezone', 'UTC'),
(6, 'notificationEmail', 'notify@milk.local');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `uid` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `mcc_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mcc_ids`)),
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `collector_batch_code` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `uid`, `username`, `full_name`, `email`, `password`, `role`, `mcc_ids`, `status`, `must_change_password`, `created_at`, `collector_batch_code`) VALUES
(1, 'admin-1', 'admin', 'System Administrator', 'admin@milk.local', 'admin123', 'SUPER_ADMIN', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 17:27:40', NULL),
(2, 'manager-1', 'manager', 'MCC Manager', 'manager@milk.local', 'manager123', 'MCC_MANAGER', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 17:27:40', NULL),
(3, 'officer-1', 'officer', 'MCC Officer', 'officer@milk.local', 'officer123', 'MCC_OFFICER', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 17:27:40', NULL),
(4, 'farmer-1', 'demo_farmer', 'Demo Farmer', 'farmer@milk.local', 'farmer123', 'FARMER', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 17:27:40', NULL),
(5, 'collector-1', 'collector', 'UMUHOZA Fabiola', 'collector@milk.local', 'collector123', 'MILK_COLLECTOR', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 17:27:40', 'BATCH-05-UF'),
(6, 'vet-1', 'veterinary', 'Veterinary Officer', 'vet@milk.local', 'vet123', 'VETERINARY_OFFICER', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 17:27:40', NULL),
(13, 'farmer-1788892298420', 'Emile', 'HITAYEZU', 'hitayezu@milk.local', 'hitayezu@milk.local', 'FARMER', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-08 18:31:38', NULL),
(41, 'farmer-1788946559011', 'nishimwe@milk.local', 'NISHIMWE', 'nishimwe@milk.local', 'nishiwme@milk.local', 'FARMER', '[\"MCC-001\"]', 'ACTIVE', 0, '2026-09-09 09:35:59', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `veterinary_records`
--

CREATE TABLE `veterinary_records` (
  `id` int(11) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `animal_id` varchar(100) NOT NULL,
  `visit_date` date NOT NULL,
  `diagnosis` varchar(255) NOT NULL,
  `treatment` text DEFAULT NULL,
  `medicine` varchar(255) DEFAULT NULL,
  `withdrawal_until` date DEFAULT NULL,
  `veterinarian_id` varchar(100) NOT NULL,
  `notes` text DEFAULT NULL,
  `clearance_status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `veterinary_records`
--

INSERT INTO `veterinary_records` (`id`, `record_id`, `animal_id`, `visit_date`, `diagnosis`, `treatment`, `medicine`, `withdrawal_until`, `veterinarian_id`, `notes`, `clearance_status`, `created_at`) VALUES
(1, 'VET-1788938086442', 'A-1788894362810-0', '2026-09-08', 'Faver', 'Arbendazole', 'Arbendazole', '1000-01-01', 'vet-1', NULL, 'CLEARED', '2026-09-09 07:14:47'),
(2, 'VET-1788943558546', 'A-1788894362810-0', '2026-09-09', 'Diarrhea', 'Take care of this cow', 'Freeezer', '2026-09-10', 'vet-1', NULL, 'ACTIVE', '2026-09-09 08:45:59'),
(3, 'VET-1788947358166', 'A-1788946728037-1', '2026-09-09', 'Ifumbi', 'Take care of the cow', 'arbendazole', '2026-09-10', 'vet-1', NULL, 'ACTIVE', '2026-09-09 09:49:19');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `administration_requests`
--
ALTER TABLE `administration_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_id` (`request_id`);

--
-- Indexes for table `animals`
--
ALTER TABLE `animals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `animal_id` (`animal_id`),
  ADD UNIQUE KEY `tag_number` (`tag_number`),
  ADD KEY `idx_animals_farmer` (`farmer_id`),
  ADD KEY `idx_animals_registration_batch` (`registration_batch_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `audit_id` (`audit_id`);

--
-- Indexes for table `breed_types`
--
ALTER TABLE `breed_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `breed_name` (`breed_name`);

--
-- Indexes for table `collector_batch_assignments`
--
ALTER TABLE `collector_batch_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `assignment_id` (`assignment_id`),
  ADD UNIQUE KEY `batch_code` (`batch_code`),
  ADD KEY `idx_collector_batch_assignments_collector` (`collector_id`,`status`);

--
-- Indexes for table `collector_payments`
--
ALTER TABLE `collector_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_id` (`payment_id`),
  ADD UNIQUE KEY `uq_collector_payment_period` (`collector_id`,`period_start`,`period_end`);

--
-- Indexes for table `cow_registration_authorizations`
--
ALTER TABLE `cow_registration_authorizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `authorization_session_id` (`authorization_session_id`),
  ADD UNIQUE KEY `batch_id` (`batch_id`),
  ADD KEY `idx_cow_registration_auth_farmer` (`farmer_id`,`status`);

--
-- Indexes for table `cow_registration_batches`
--
ALTER TABLE `cow_registration_batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `batch_id` (`batch_id`),
  ADD UNIQUE KEY `authorization_session_id` (`authorization_session_id`),
  ADD KEY `idx_cow_registration_batches_farmer` (`farmer_id`,`status`),
  ADD KEY `idx_cow_registration_batches_requester` (`requested_by`,`status`);

--
-- Indexes for table `cow_registration_batch_cows`
--
ALTER TABLE `cow_registration_batch_cows`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `animal_id` (`animal_id`),
  ADD UNIQUE KEY `uq_batch_cow_tag` (`batch_id`,`tag_number`),
  ADD KEY `fk_batch_cows_farmer` (`farmer_id`);

--
-- Indexes for table `cow_registration_batch_items`
--
ALTER TABLE `cow_registration_batch_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cow_registration_batch_animal` (`batch_id`,`animal_id`),
  ADD UNIQUE KEY `uq_cow_registration_batch_tag` (`batch_id`,`tag_number`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `expense_id` (`expense_id`),
  ADD KEY `idx_expenses_date` (`expense_date`);

--
-- Indexes for table `expense_types`
--
ALTER TABLE `expense_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

--
-- Indexes for table `farmers`
--
ALTER TABLE `farmers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `farmer_id` (`farmer_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `national_id` (`national_id`),
  ADD KEY `idx_farmers_mcc` (`mcc_id`);

--
-- Indexes for table `farmer_payments`
--
ALTER TABLE `farmer_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_id` (`payment_id`),
  ADD KEY `idx_payments_farmer` (`farmer_id`);

--
-- Indexes for table `mccs`
--
ALTER TABLE `mccs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mcc_id` (`mcc_id`),
  ADD UNIQUE KEY `mcc_code` (`mcc_code`);

--
-- Indexes for table `milk_batches`
--
ALTER TABLE `milk_batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `batch_id` (`batch_id`),
  ADD KEY `idx_batches_date` (`batch_date`),
  ADD KEY `fk_batches_mcc` (`mcc_id`);

--
-- Indexes for table `milk_batch_collections`
--
ALTER TABLE `milk_batch_collections`
  ADD PRIMARY KEY (`batch_id`,`collection_id`),
  ADD KEY `fk_batch_collections_collection` (`collection_id`);

--
-- Indexes for table `milk_collections`
--
ALTER TABLE `milk_collections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `collection_id` (`collection_id`),
  ADD KEY `idx_collections_date` (`collection_date`),
  ADD KEY `idx_collections_farmer` (`farmer_id`),
  ADD KEY `fk_collections_mcc` (`mcc_id`),
  ADD KEY `idx_collections_animal` (`animal_id`);

--
-- Indexes for table `milk_collection_requests`
--
ALTER TABLE `milk_collection_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_id` (`request_id`),
  ADD KEY `idx_collection_requests_collector` (`collector_id`,`status`),
  ADD KEY `idx_collection_requests_farmer` (`farmer_id`,`status`);

--
-- Indexes for table `quality_tests`
--
ALTER TABLE `quality_tests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `test_id` (`test_id`),
  ADD KEY `idx_quality_collection` (`collection_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key_name` (`key_name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uid` (`uid`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `collector_batch_code` (`collector_batch_code`);

--
-- Indexes for table `veterinary_records`
--
ALTER TABLE `veterinary_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `record_id` (`record_id`),
  ADD KEY `idx_vet_animal` (`animal_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `administration_requests`
--
ALTER TABLE `administration_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `animals`
--
ALTER TABLE `animals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `breed_types`
--
ALTER TABLE `breed_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `collector_batch_assignments`
--
ALTER TABLE `collector_batch_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `collector_payments`
--
ALTER TABLE `collector_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `cow_registration_authorizations`
--
ALTER TABLE `cow_registration_authorizations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `cow_registration_batches`
--
ALTER TABLE `cow_registration_batches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `cow_registration_batch_cows`
--
ALTER TABLE `cow_registration_batch_cows`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cow_registration_batch_items`
--
ALTER TABLE `cow_registration_batch_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_types`
--
ALTER TABLE `expense_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `farmers`
--
ALTER TABLE `farmers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `farmer_payments`
--
ALTER TABLE `farmer_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mccs`
--
ALTER TABLE `mccs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `milk_batches`
--
ALTER TABLE `milk_batches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `milk_collections`
--
ALTER TABLE `milk_collections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `milk_collection_requests`
--
ALTER TABLE `milk_collection_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quality_tests`
--
ALTER TABLE `quality_tests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `veterinary_records`
--
ALTER TABLE `veterinary_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `animals`
--
ALTER TABLE `animals`
  ADD CONSTRAINT `fk_animals_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`);

--
-- Constraints for table `cow_registration_authorizations`
--
ALTER TABLE `cow_registration_authorizations`
  ADD CONSTRAINT `fk_cow_registration_auth_batch` FOREIGN KEY (`batch_id`) REFERENCES `cow_registration_batches` (`batch_id`),
  ADD CONSTRAINT `fk_cow_registration_auth_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`);

--
-- Constraints for table `cow_registration_batches`
--
ALTER TABLE `cow_registration_batches`
  ADD CONSTRAINT `fk_cow_registration_batch_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`);

--
-- Constraints for table `cow_registration_batch_cows`
--
ALTER TABLE `cow_registration_batch_cows`
  ADD CONSTRAINT `fk_batch_cows_batch` FOREIGN KEY (`batch_id`) REFERENCES `cow_registration_batches` (`batch_id`),
  ADD CONSTRAINT `fk_batch_cows_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`);

--
-- Constraints for table `cow_registration_batch_items`
--
ALTER TABLE `cow_registration_batch_items`
  ADD CONSTRAINT `fk_cow_registration_item_batch` FOREIGN KEY (`batch_id`) REFERENCES `cow_registration_batches` (`batch_id`);

--
-- Constraints for table `farmers`
--
ALTER TABLE `farmers`
  ADD CONSTRAINT `fk_farmers_mcc` FOREIGN KEY (`mcc_id`) REFERENCES `mccs` (`mcc_id`);

--
-- Constraints for table `farmer_payments`
--
ALTER TABLE `farmer_payments`
  ADD CONSTRAINT `fk_payments_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`);

--
-- Constraints for table `milk_batches`
--
ALTER TABLE `milk_batches`
  ADD CONSTRAINT `fk_batches_mcc` FOREIGN KEY (`mcc_id`) REFERENCES `mccs` (`mcc_id`);

--
-- Constraints for table `milk_batch_collections`
--
ALTER TABLE `milk_batch_collections`
  ADD CONSTRAINT `fk_batch_collections_batch` FOREIGN KEY (`batch_id`) REFERENCES `milk_batches` (`batch_id`),
  ADD CONSTRAINT `fk_batch_collections_collection` FOREIGN KEY (`collection_id`) REFERENCES `milk_collections` (`collection_id`);

--
-- Constraints for table `milk_collections`
--
ALTER TABLE `milk_collections`
  ADD CONSTRAINT `fk_collections_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`),
  ADD CONSTRAINT `fk_collections_mcc` FOREIGN KEY (`mcc_id`) REFERENCES `mccs` (`mcc_id`);

--
-- Constraints for table `milk_collection_requests`
--
ALTER TABLE `milk_collection_requests`
  ADD CONSTRAINT `fk_collection_request_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`farmer_id`);

--
-- Constraints for table `quality_tests`
--
ALTER TABLE `quality_tests`
  ADD CONSTRAINT `fk_quality_collection` FOREIGN KEY (`collection_id`) REFERENCES `milk_collections` (`collection_id`);

--
-- Constraints for table `veterinary_records`
--
ALTER TABLE `veterinary_records`
  ADD CONSTRAINT `fk_vet_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`animal_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
