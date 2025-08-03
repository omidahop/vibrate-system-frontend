import { createElement, html } from '../../utils/reactUtils.js';
import { APP_CONFIG } from '../../utils/constants.js';

export class Footer {
    constructor(options = {}) {
        this.showVersion = options.showVersion !== false;
        this.showLinks = options.showLinks !== false;
        this.showStatus = options.showStatus !== false;
        this.customContent = options.customContent || '';
        this.element = null;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.updateStatus();
        
        // Update status periodically
        setInterval(() => {
            this.updateStatus();
        }, 30000);
    }

    create() {
        const versionInfo = this.showVersion ? html`
            <div class="footer-section version-info">
                <span class="version-label">نسخه:</span>
                <span class="version-number">${APP_CONFIG.version}</span>
            </div>
        ` : '';

        const links = this.showLinks ? html`
            <div class="footer-section footer-links">
                <a href="#" class="footer-link" data-action="about">
                    <i class="fas fa-info-circle"></i>
                    درباره
                </a>
                <a href="#" class="footer-link" data-action="help">
                    <i class="fas fa-question-circle"></i>
                    راهنما
                </a>
                <a href="#" class="footer-link" data-action="contact">
                    <i class="fas fa-envelope"></i>
                    تماس
                </a>
            </div>
        ` : '';

        const statusInfo = this.showStatus ? html`
            <div class="footer-section status-info">
                <div class="status-item">
                    <i class="fas fa-database" id="db-status-icon"></i>
                    <span id="db-status-text">دیتابیس</span>
                </div>
                <div class="status-item">
                    <i class="fas fa-sync" id="sync-status-icon"></i>
                    <span id="sync-status-text">همگام‌سازی</span>
                </div>
                <div class="status-item">
                    <i class="fas fa-clock" id="time-status"></i>
                    <span id="current-time"></span>
                </div>
            </div>
        ` : '';

        const customContent = this.customContent ? html`
            <div class="footer-section custom-content">
                ${this.customContent}
            </div>
        ` : '';

        this.element = createElement(html`
            <footer class="footer" id="app-footer">
                <div class="container">
                    <div class="footer-content">
                        ${versionInfo}
                        ${links}
                        ${statusInfo}
                        ${customContent}
                        
                        <div class="footer-section copyright">
                            <span>© ${new Date().getFullYear()} سیستم ویبره. تمامی حقوق محفوظ است.</span>
                        </div>
                    </div>
                </div>
            </footer>
        `);
    }

    attachEvents() {
        // Footer links
        const footerLinks = this.element.querySelectorAll('.footer-link');
        footerLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = link.getAttribute('data-action');
                this.handleLinkClick(action);
            });
        });

        // Status items click for more info
        const statusItems = this.element.querySelectorAll('.status-item');
        statusItems.forEach(item => {
            item.addEventListener('click', () => {
                this.showStatusDetails();
            });
        });
    }

    async handleLinkClick(action) {
        switch (action) {
            case 'about':
                await this.showAboutDialog();
                break;
            case 'help':
                await this.showHelpDialog();
                break;
            case 'contact':
                await this.showContactDialog();
                break;
        }
    }

    async showAboutDialog() {
        const { Modal } = await import('../Common/Modal.js');
        
        const aboutContent = html`
            <div class="about-content">
                <div class="about-logo">
                    <i class="fas fa-chart-line" style="font-size: 3rem; color: var(--primary-color);"></i>
                </div>
                
                <h4>سیستم ثبت داده‌های ویبره تجهیزات</h4>
                <p class="version-info">نسخه ${APP_CONFIG.version}</p>
                
                <div class="features-list">
                    <h5>ویژگی‌های کلیدی:</h5>
                    <ul>
                        <li><i class="fas fa-check text-success"></i> ثبت و مدیریت داده‌های ویبره</li>
                        <li><i class="fas fa-check text-success"></i> نمودارهای تحلیلی پیشرفته</li>
                        <li><i class="fas fa-check text-success"></i> آنالیز خودکار افزایش‌های غیرعادی</li>
                        <li><i class="fas fa-check text-success"></i> همگام‌سازی با سرور</li>
                        <li><i class="fas fa-check text-success"></i> قابلیت کار آفلاین</li>
                        <li><i class="fas fa-check text-success"></i> رابط کاربری فارسی</li>
                    </ul>
                </div>
                
                <div class="tech-info">
                    <h5>اطلاعات فنی:</h5>
                    <div class="tech-grid">
                        <div>Frontend: Vanilla JavaScript</div>
                        <div>Backend: Supabase</div>
                        <div>Database: PostgreSQL</div>
                        <div>Hosting: Vercel</div>
                    </div>
                </div>
            </div>
        `;

        const modal = new Modal({
            title: 'درباره برنامه',
            content: aboutContent,
            size: 'medium'
        });

        modal.addButton('بستن', 'btn btn-primary', () => {
            modal.destroy();
        }).open();
    }

    async showHelpDialog() {
        const { Modal } = await import('../Common/Modal.js');
        
        const helpContent = html`
            <div class="help-content">
                <div class="help-section">
                    <h5><i class="fas fa-edit"></i> ثبت داده</h5>
                    <p>برای ثبت داده‌های جدید، ابتدا واحد مورد نظر را انتخاب کنید و سپس مقادیر پارامترها را وارد نمایید.</p>
                </div>
                
                <div class="help-section">
                    <h5><i class="fas fa-chart-area"></i> نمودارها</h5>
                    <p>برای مشاهده نمودارها باید وارد سیستم شوید. می‌توانید نمودار پارامترهای مختلف را در بازه‌های زمانی مختلف مشاهده کنید.</p>
                </div>
                
                <div class="help-section">
                    <h5><i class="fas fa-search"></i> آنالیز</h5>
                    <p>بخش آنالیز به‌طور خودکار افزایش‌های غیرعادی در پارامترها را شناسایی و نمایش می‌دهد.</p>
                </div>
                
                <div class="help-section">
                    <h5><i class="fas fa-sync"></i> همگام‌سازی</h5>
                    <p>داده‌های ثبت شده در حالت آفلاین را می‌توانید از طریق منوی کاربری با سرور همگام‌سازی کنید.</p>
                </div>
                
                <div class="help-section">
                    <h5><i class="fas fa-keyboard"></i> کلیدهای میانبر</h5>
                    <ul>
                        <li><kbd>Enter</kbd> - ثبت مقدار فعلی</li>
                        <li><kbd>Escape</kbd> - بستن پنجره‌ها</li>
                        <li><kbd>Tab</kbd> - حرکت بین فیلدها</li>
                    </ul>
                </div>
            </div>
        `;

        const modal = new Modal({
            title: 'راهنمای استفاده',
            content: helpContent,
            size: 'large'
        });

        modal.addButton('بستن', 'btn btn-primary', () => {
            modal.destroy();
        }).open();
    }

    async showContactDialog() {
        const { Modal } = await import('../Common/Modal.js');
        
        const contactContent = html`
            <div class="contact-content">
                <div class="contact-section">
                    <h5><i class="fas fa-envelope"></i> ایمیل پشتیبانی</h5>
                    <p>support@vibratesystem.com</p>
                </div>
                
                <div class="contact-section">
                    <h5><i class="fas fa-phone"></i> تلفن</h5>
                    <p>021-12345678</p>
                </div>
                
                <div class="contact-section">
                    <h5><i class="fas fa-clock"></i> ساعات کاری</h5>
                    <p>شنبه تا چهارشنبه: 8:00 - 17:00</p>
                    <p>پنج‌شنبه: 8:00 - 13:00</p>
                </div>
                
                <div class="contact-section">
                    <h5><i class="fas fa-bug"></i> گزارش مشکل</h5>
                    <p>برای گزارش مشکلات فنی، لطفاً تصویری از خطا و مراحل بازتولید آن را به همراه گزارش خود ارسال نمایید.</p>
                </div>
            </div>
        `;

        const modal = new Modal({
            title: 'تماس با پشتیبانی',
            content: contactContent,
            size: 'medium'
        });

        modal.addButton('بستن', 'btn btn-primary', () => {
            modal.destroy();
        }).open();
    }

    async showStatusDetails() {
        const { Modal } = await import('../Common/Modal.js');
        const { default: dataService } = await import('../../services/dataService.js');
        
        try {
            const stats = await dataService.getDatabaseStats();
            const syncStatus = dataService.getSyncStatus();
            
            const statusContent = html`
                <div class="status-details">
                    <div class="status-group">
                        <h5><i class="fas fa-database"></i> وضعیت دیتابیس محلی</h5>
                        <div class="status-grid">
                            <div>تعداد کل رکوردها: <strong>${stats?.local?.totalRecords || 0}</strong></div>
                            <div>در انتظار همگام‌سازی: <strong>${stats?.local?.pendingSync || 0}</strong></div>
                            <div>DRI1: <strong>${stats?.local?.byUnit?.DRI1 || 0}</strong></div>
                            <div>DRI2: <strong>${stats?.local?.byUnit?.DRI2 || 0}</strong></div>
                        </div>
                    </div>
                    
                    ${stats?.server ? html`
                        <div class="status-group">
                            <h5><i class="fas fa-server"></i> وضعیت سرور</h5>
                            <div class="status-grid">
                                <div>تعداد کل رکوردها: <strong>${stats.server.totalRecords}</strong></div>
                                <div>DRI1: <strong>${stats.server.byUnit.DRI1}</strong></div>
                                <div>DRI2: <strong>${stats.server.byUnit.DRI2}</strong></div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="status-group">
                        <h5><i class="fas fa-sync"></i> وضعیت همگام‌سازی</h5>
                        <div class="status-grid">
                            <div>وضعیت: <strong>${syncStatus.inProgress ? 'در حال انجام' : 'آماده'}</strong></div>
                            <div>آخرین همگام‌سازی: <strong>${syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString('fa-IR') : 'هرگز'}</strong></div>
                            <div>احراز هویت: <strong>${syncStatus.isAuthenticated ? 'موفق' : 'نشده'}</strong></div>
                        </div>
                    </div>
                </div>
            `;

            const modal = new Modal({
                title: 'جزئیات وضعیت سیستم',
                content: statusContent,
                size: 'medium'
            });

            modal.addButton('بستن', 'btn btn-primary', () => {
                modal.destroy();
            }).open();
            
        } catch (error) {
            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.error('خطا در دریافت اطلاعات وضعیت');
        }
    }

    async updateStatus() {
        // Update database status
        const dbIcon = this.element.querySelector('#db-status-icon');
        const dbText = this.element.querySelector('#db-status-text');
        
        if (dbIcon && dbText) {
            try {
                const { default: dataService } = await import('../../services/dataService.js');
                const stats = await dataService.getDatabaseStats();
                
                if (stats && stats.local.totalRecords > 0) {
                    dbIcon.className = 'fas fa-database';
                    dbIcon.style.color = 'var(--success-color)';
                    dbText.textContent = `${stats.local.totalRecords} رکورد`;
                } else {
                    dbIcon.className = 'fas fa-database';
                    dbIcon.style.color = 'var(--text-muted)';
                    dbText.textContent = 'خالی';
                }
            } catch (error) {
                dbIcon.className = 'fas fa-exclamation-triangle';
                dbIcon.style.color = 'var(--error-color)';
                dbText.textContent = 'خطا';
            }
        }

        // Update sync status
        const syncIcon = this.element.querySelector('#sync-status-icon');
        const syncText = this.element.querySelector('#sync-status-text');
        
        if (syncIcon && syncText) {
            try {
                const { default: dataService } = await import('../../services/dataService.js');
                const syncStatus = dataService.getSyncStatus();
                
                if (syncStatus.inProgress) {
                    syncIcon.className = 'fas fa-sync fa-spin';
                    syncIcon.style.color = 'var(--primary-color)';
                    syncText.textContent = 'در حال انجام';
                } else if (syncStatus.isAuthenticated) {
                    syncIcon.className = 'fas fa-check-circle';
                    syncIcon.style.color = 'var(--success-color)';
                    syncText.textContent = 'آماده';
                } else {
                    syncIcon.className = 'fas fa-user-slash';
                    syncIcon.style.color = 'var(--warning-color)';
                    syncText.textContent = 'غیرفعال';
                }
            } catch (error) {
                syncIcon.className = 'fas fa-exclamation-triangle';
                syncIcon.style.color = 'var(--error-color)';
                syncText.textContent = 'خطا';
            }
        }

        // Update current time
        const timeElement = this.element.querySelector('#current-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    mount(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.appendChild(this.element);
        }
        
        return this;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default Footer;