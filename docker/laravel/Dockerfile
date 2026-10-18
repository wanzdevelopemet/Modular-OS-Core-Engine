FROM php:8.4-cli-alpine

# Cài đặt system dependencies & PHP extensions cần thiết cho Laravel 11, Redis, MySQL
RUN apk update && apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    oniguruma-dev \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo_mysql mbstring pcntl bcmath sockets \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Cài đặt Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Expose port cho PHP built-in server hoặc Octane Swoole/Roadrunner
EXPOSE 8000

# Khởi chạy server Laravel bằng Laravel Octane (RoadRunner runtime)
CMD ["php", "artisan", "octane:start", "--server=roadrunner", "--host=0.0.0.0", "--port=8000"]

