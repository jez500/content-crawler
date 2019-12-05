FROM mattrayner/lamp:latest

# Install node js
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

# Copy config files
ADD vhost.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80 3306
CMD ["/run.sh"]