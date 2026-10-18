<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModuleRegistry extends Model
{
    use HasFactory;

    protected $table = 'modules_registry';

    protected $fillable = [
        'module_id',
        'name',
        'frontend_type',
        'remote_entry_url',
        'url',
        'secret_key_hash',
        'secret_key',
        'is_active',
        'is_default_home',
        'requires_auth',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default_home' => 'boolean',
        'requires_auth' => 'boolean',
    ];

    protected $appends = [
        'url',
        'secret_key'
    ];

    /**
     * Scope lọc các module đang hoạt động
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Accessors & Mutators for compatibility between (url <-> remote_entry_url) and (secret_key <-> secret_key_hash)
    public function getUrlAttribute()
    {
        return $this->attributes['url'] ?? $this->attributes['remote_entry_url'] ?? '';
    }

    public function setUrlAttribute($value)
    {
        $this->attributes['url'] = $value;
        if (!isset($this->attributes['remote_entry_url']) || empty($this->attributes['remote_entry_url'])) {
            $this->attributes['remote_entry_url'] = $value;
        }
    }

    public function getSecretKeyAttribute()
    {
        return $this->attributes['secret_key'] ?? $this->attributes['secret_key_hash'] ?? '';
    }

    public function setSecretKeyAttribute($value)
    {
        $this->attributes['secret_key'] = $value;
        if (!isset($this->attributes['secret_key_hash']) || empty($this->attributes['secret_key_hash'])) {
            $this->attributes['secret_key_hash'] = $value;
        }
    }
}
