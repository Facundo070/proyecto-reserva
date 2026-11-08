/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reservation_id,resource_id]` on the table `reservation_resources` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `status_reservations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `status_resources` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `role` ENUM('ADMIN', 'DOCENTE') NOT NULL DEFAULT 'DOCENTE';

-- CreateIndex
CREATE UNIQUE INDEX `categories_name_key` ON `categories`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `reservation_resources_reservation_id_resource_id_key` ON `reservation_resources`(`reservation_id`, `resource_id`);

-- CreateIndex
CREATE INDEX `reservations_start_date_end_date_idx` ON `reservations`(`start_date`, `end_date`);

-- CreateIndex
CREATE UNIQUE INDEX `status_reservations_name_key` ON `status_reservations`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `status_resources_name_key` ON `status_resources`(`name`);

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_created_by_user_fkey` FOREIGN KEY (`created_by_user`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
