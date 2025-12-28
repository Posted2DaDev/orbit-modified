$migrations = @(
    "20221207023137_",
    "20221207025925_",
    "20221207154757_",
    "20221207231841_",
    "20221210232021_new",
    "20221211023646_",
    "20221212200916_",
    "20221212201514_",
    "20221215230701_",
    "20221216000735_",
    "20221216001601_",
    "20221221000943_",
    "20221221004412_",
    "20221221152835_",
    "20221221155558_",
    "20221228110120_",
    "20221228173857_",
    "20221228180208_",
    "20221228192940_",
    "20221228195305_",
    "20221229140216_",
    "20221229160046_",
    "20221229180050_",
    "20221229184349_",
    "20250121_remove_discord_webhooks",
    "20250124_add_api_keys",
    "20250320034535_add_image_to_wallpost",
    "2025052200101_registered",
    "20250613_birthdays",
    "20250619_fixquotas",
    "20250619_quotaroles",
    "20251011203302_hw_25",
    "20251020173756_sessions_update",
    "20251030205531_activity_update",
    "20251101105708_external_services",
    "20251108102907_session_endtime",
    "20251114204818_audit_logs",
    "20251121224208_saved_views",
    "20251121224230_userbook_redactions",
    "20251127_add_policies",
    "20251128204107_alliances_info",
    "20251129211444_policies",
    "20251226230000_add_promotions",
    "20251226235000_promotions_role_relations"
)

foreach ($migration in $migrations) {
    Write-Host "Marking $migration as applied..."
    & npx prisma migrate resolve --applied $migration
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to mark $migration as applied"
        exit 1
    }
}

Write-Host "All migrations marked as applied!"
