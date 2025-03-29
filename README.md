# ZoomInfoApiForNode
Scaffold for setting up ZoomInfo enrichment to run on node.js 
Step 1: Search for contacts at company based on its domain and contact job title keywords
Step 2: Enrich each new contact (not currently in CRM) from ZoomInfo and insert into CRM

// Example usage:
export default class ZiAccountContactsLoad {
  crmApi: CrmApiService = new CrmApiService();

  async run(account: EnrichAccount, currentContacts: EnrichCrmContact[], includedKeywords: string[]) {
    console.log(`Searching for ZI contacts based on specified keywords`);
    const results: ZiApiContact[] = [];
    const cSearch = new ZoomInfoContactSearchByCompany(account.domain);

    for (const keyword of includedKeywords) {
      cSearch.jobTitleKeyword = keyword;
      const searchResults = await cSearch.run();
      console.log(` - ${searchResults.length} with keyword '${keyword}' in their job title`);
      results.push(...searchResults);
    }

    const dedupedResults = results.filter(
      (contact, index, self) => index === self.findIndex((t) => t.id === contact.id)
    );

    const newContacts = dedupedResults.filter(
      (contact) =>
        !currentContacts.some(
          (currentContact) =>
            contact.id.toString() === currentContact['ZoomInfo Contact ID'] && contact.hasEmail === true
        )
    );

    let newCrmContactCount: number = 0;
    const ziContactEnrich = new ZoomInfoContactEnrichHasMoved();
    ziContactEnrich.outputFields = ['firstName', 'lastName', 'email', 'phone', 'mobilePhone'];
    console.log(` - ${newContacts.length} unique contacts found from ZoomInfo.`);

    console.log();
    console.log(`Looking at each new contact and inserting into CRM if they don't already exist...`);

    for (const contact of newContacts) {
      try {
        await TimeoutUtil.setTimeout(
          this.#processContact(contact, ziContactEnrich, newCrmContactCount, account.emailSlug || ''),
          20000 // 20 seconds timeout
        );
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(` - Timeout occurred while processing contact with ZI id ${contact.id}: ${errorMessage}`);
        // Optionally add custom handling for timeouts if needed
      }
    }

    console.log(
      `${newContacts.length} new contacts for ${account.name} - ${account.domain}. Inserted ${newCrmContactCount} into Crm.`
    );

    return newContacts;
  }

  async #processContact(
    contact: ZiApiContact,
    ziContactEnrich: ZoomInfoContactEnrichHasMoved,
    newCrmContactCount: number,
    emailSlug: string
  ): Promise<unknown> {
    // Enrich the contact with ZoomInfo
    const enrichedContact: any = await this.#enrichContact(contact.id, ziContactEnrich);

    // If enrichedContact is undefined, skip the contact
    if (!enrichedContact) {
      console.log(` - Contact with ZI id ${contact.id} skipped. Not found.`);
      return;
    }

    // If the email address is empty, skip the contact
    if (!enrichedContact.email) {
      console.log(` - '${enrichedContact.firstName} ${enrichedContact.lastName}' skipped. No email address.`);
      return;
    }

    // if the email address doesn't contain the account.emailSlug, skip the contact
    if (!enrichedContact.email.includes(emailSlug)) {
      console.log(
        ` - '${enrichedContact.firstName} ${enrichedContact.lastName}' skipped. '${enrichedContact.email}' does not contain slug '${emailSlug}'.`
      );
      return;
    }

    // Check if the contact already exists in CRM
    const contactExists = await this.#checkIfContactExistsInCrmByEmail(enrichedContact.email);

    // If the contact does not exist in Crm, insert the contact
    if (!contactExists) {
      await this.insertContactIntoCrm(enrichedContact);
      console.log(` - Crm insert: ${enrichedContact.firstName} ${enrichedContact.lastName}; ${enrichedContact.email}`);
      newCrmContactCount++;
    }
  }

  async insertContactIntoCrm(contact: any) {
    // Insert the contact into Crm
    const contactInserted = await this.CrmApi.insertContact(
      contact.firstName,
      contact.lastName,
      contact.accountId,
      contact.email,
      contact.phone,
      contact.mobilePhone,
      contact.id
    );

    return contactInserted;
  }

  async #enrichContact(ziContactId: string, contactEnrich: ZoomInfoContactEnrichHasMoved) {
    // Enrich contact with ZoomInfoContactEnrichHasMoved
    contactEnrich.setContactId(ziContactId);
    const enrichedContact = await contactEnrich.enrichContact();

    return enrichedContact;
  }

  async #checkIfContactExistsInCrmByEmail(email: string): Promise<boolean> {
    // Check if the contact exists in Crm by email
    return await this.crmApi.contactExistsInCrm(email);
  }
}
