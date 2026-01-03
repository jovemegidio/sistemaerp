#!/bin/bash
# Script de backup automático - ALUFORCE v2.0
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="./backups/backup_aluforce_$DATE.sql"

# Backup do banco de dados
mysqldump -u undefined -pundefined undefined > $BACKUP_FILE

# Compressão do backup
gzip $BACKUP_FILE

# Limpeza de backups antigos (manter apenas os últimos 30 dias)
find ./backups -name "backup_aluforce_*.sql.gz" -mtime +30 -delete

echo "Backup concluído: $BACKUP_FILE.gz"
