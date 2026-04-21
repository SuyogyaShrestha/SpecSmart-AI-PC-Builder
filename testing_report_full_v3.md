# 4. Testing and Analysis

Test analysis is the process of reviewing and analysing test artefacts to develop test conditions or test cases in software testing. The purpose of test analysis is to gather requirements and generate test goals to maintain test conditions. It explains what will be tested in the form of test conditions and can begin as soon as the testing foundation for each test level has been defined.

## 4.1 Test Plan

### 4.1.1 Unit Testing, Test Plan

The unit test plan aims to validate the functionality and reliability of a project system's components, including user authentication, part selection, hardware compatibility validation, AI-driven build generation workflows, AI expert analytical reviews, and background data scraping. The tests cover an exhaustive range of functionalities, ensuring their correctness impacts user experience, system security, AI accuracy, and integration reliability.

Test and objectives of the test are further listed in the given table:

| Test Number | Objective |
|-------------|-----------|
| 1 | Validate User Registration with appropriate valid details. |
| 2 | Reject User Registration on duplicate email address. |
| 3 | Verify login functionality works correctly for registered users. |
| 4 | Ensure users with invalid credentials cannot log in. |
| 5 | Validate persistent browsing session via authentication JWT token. |
| 6 | Verify logout process reliably clears local tokens. |
| 7 | Ensure User Dashboard correctly tallies and displays saved builds. |
| 8 | Check manual part selection correctly updates the PC builder row state. |
| 9 | Verify warning red banner displays on CPU and Motherboard socket mismatch. |
| 10 | Verify warning red banner displays on RAM and Motherboard generation mismatch (e.g., DDR4 vs DDR5). |
| 11 | Ensure the builder calculates total required system wattage and flags undersized PSUs. |
| 12 | Test AI "Generate" strict adherence to a specified monetary budget constraint. |
| 13 | Test AI "Generate" strict adherence to a specific brand preference. |
| 14 | Test AI "Generate" shifting logic across diverse use cases (e.g., Gaming vs Productivity weighting). |
| 15 | Validate AI "Fill" feature safely generates remaining parts without overriding manually locked parts. |
| 16 | Validate Expert AI Build Review correctly analyzes combinations for structural bottlenecks. |
| 17 | Confirm parts catalog correctly filters structural components by category tabs (e.g., RAM, GPU). |
| 18 | Confirm parts catalog correctly fetches results via text search bar. |
| 19 | Check part detail pages correctly render dynamic specifications based on part type. |
| 20 | Verify historical part price chart smoothly re-renders dynamic periods (30/90 days). |
| 21 | Test functionality of saving a completed PC build securely to the user dashboard. |
| 22 | Validate authorization to permanently delete a saved build from the Saved Builds card. |
| 23 | Test loading a saved build from the dashboard back into the active PC Builder. |
| 24 | Verify detailed comparative metrics in the side-by-side build comparison tool. |
| 25 | Ensure the AI Chat Assistant responds properly to hardware inquiry prompts. |
| 26 | Confirm proper structural CSS toggling between Dark Mode and Light Mode UI themes. |
| 27 | Validate Admin ability to manually create a robust component entry into the database. |
| 28 | Validate Admin's ability to edit an existing part's core specifications via forms. |
| 29 | Verify Admin's ability to securely permanently delete a component from the database. |
| 30 | Check Admin ability to promote and demote user roles securely. |
| 31 | Check Admin toggling capability to cleanly deactivate user accounts to prevent malicious access. |
| 32 | Verify administrators can permanently delete a user account. |
| 33 | Check Admin capability to cleanly deactivate specific vendor scraping. |
| 34 | Ensure Admin Dashboard statistical metric counts render dynamically. |
| 35 | Test manual Force Scrape triggering live real-time price synchronization. |
| 36 | Verify background executing web scraper survives invalid item URLs without breaking the application stack. |
| 37 | Check Machine Learning pipeline successfully serializes and retrains models post-data injection. |
| 38 | Test platform ability to synthesize builds natively via the internal Scikit-Learn ML pipeline (Non-LLM generation). |

*Table 1: Test plans*

---

### 4.1.2 SYSTEM TESTING, TEST PLAN

System testing validates the entire and fully integrated software product. A system test evaluates end-to-end system specs. The software is usually just one part of a broader computer-based system. System testing is a crucial phase in software development, ensuring the system's functionality operates as intended in a simulated production environment.

---

## 4.2 Unit Testing

*(Note: Actual Result screenshots and code snippets are to be placed below each table.)*

### 4.2.1 Test Case 1: Valid user registration

| | |
|---|---|
| **Objective** | To test the registration functionality with new, valid user details. |
| **Action** | Input a new email, username, and confirm password in the register UI. |
| **Expected Result** | Account should be created and user instantly redirected to Dashboard. |
| **Actual Result** | User was successfully registered, tokens were stored, and UI advanced to Dashboard. |
| **Conclusion** | Test passed. |

### 4.2.2 Test Case 2: Invalid user registration (duplicate)

| | |
|---|---|
| **Objective** | To test system rejection of duplicate emails. |
| **Action** | Attempt to register with an email already present in the database. |
| **Expected Result** | The form should block submission and output an "Email already exists" error. |
| **Actual Result** | Registration failed as designed and a red alert warned the user. |
| **Conclusion** | Test passed. |

### 4.2.3 Test Case 3: Login functionality test for registered users

| | |
|---|---|
| **Objective** | To test login functionality for a valid user account. |
| **Action** | Attempt to log in using correct email and password credentials. |
| **Expected Result** | User should be authenticated and seamlessly redirected to their standard dashboard. |
| **Actual Result** | User was successfully logged in and redirected to the dashboard interface. |
| **Conclusion** | Test passed. |

### 4.2.4 Test Case 4: Login functionality test with invalid credentials

| | |
|---|---|
| **Objective** | To test login functionality without proper user registration or correct passwords. |
| **Action** | Attempt to log in with an unregistered email or an incorrect password. |
| **Expected Result** | User should not be able to log in and an invalid credentials error message should be shown. |
| **Actual Result** | User was not able to log in and the error message was correctly displayed on screen. |
| **Conclusion** | Test passed. |

### 4.2.5 Test Case 5: Persistent session test

| | |
|---|---|
| **Objective** | To verify session cookies and JWT mechanisms persist across tabs. |
| **Action** | Log in, refresh the web browser, and close/reopen the tab. |
| **Expected Result** | The user should remain logged in without needing to re-enter credentials. |
| **Actual Result** | The website successfully utilized local tokens to bypass the login screen upon reload. |
| **Conclusion** | Test passed. |

### 4.2.6 Test Case 6: Logout functionality

| | |
|---|---|
| **Objective** | To verify proper security teardown upon logout. |
| **Action** | Click the Logout button from the sidebar. |
| **Expected Result** | UI resets, user is routed to the home page, and trying to access the dashboard fails. |
| **Actual Result** | User was securely booted, tokens obliterated from storage, maintaining data security. |
| **Conclusion** | Test passed. |

### 4.2.7 Test Case 7: Dashboard state loading

| | |
|---|---|
| **Objective** | To confirm dynamic user data renders securely in external dashboard modules. |
| **Action** | Navigate to Dashboard holding previously saved builds. |
| **Expected Result** | The interface should tally the total builds correctly and list the names dynamically. |
| **Actual Result** | Dashboard statistics perfectly mirrored the relational PostgreSQL database count. |
| **Conclusion** | Test passed. |

### 4.2.8 Test Case 8: Manual PC Part Selection

| | |
|---|---|
| **Objective** | To test if clicking components in the parts menu successfully adds them to the builder row. |
| **Action** | Click on the CPU row, select a processor from the modal, and confirm. |
| **Expected Result** | The empty builder row should update formatting to show the CPU name, price, and image. |
| **Actual Result** | The row successfully updated with the correct component details and increased total build price. |
| **Conclusion** | Test passed. |

### 4.2.9 Test Case 9: Hardware Compatibility Warning (Sockets)

| | |
|---|---|
| **Objective** | To test if the system dynamically prevents physically incompatible builds. |
| **Action** | Select an Intel CPU (LGA1700) and pair it with an AMD Motherboard (AM5). |
| **Expected Result** | The system should instantly render a red warning banner explaining the socket mismatch. |
| **Actual Result** | The red warning banner appeared correctly displaying the specific socket conflict. |
| **Conclusion** | Test passed. |

### 4.2.10 Test Case 10: Hardware Compatibility Warning (Memory)

| | |
|---|---|
| **Objective** | To test the motherboard vs RAM structural integrity matrix. |
| **Action** | Select a DDR5 motherboard platform alongside a stick of DDR4 memory. |
| **Expected Result** | The red warning banner surfaces alerting the user of RAM physical limitations. |
| **Actual Result** | Warning rendered confirming the electrical conflict mapping functions flawlessly. |
| **Conclusion** | Test passed. |

### 4.2.11 Test Case 11: PSU Wattage Assessment

| | |
|---|---|
| **Objective** | To ensure electrical safety boundaries are measured. |
| **Action** | Select high-draw GPU/CPU alongside a low wattage (400W) PSU. |
| **Expected Result** | Wattage gauge reflects "Insufficient" boundaries advising a higher-rated power supply. |
| **Actual Result** | Total wattage calculation exceeded rated specs, properly turning the UI indicator red. |
| **Conclusion** | Test passed. |

### 4.2.12 Test Case 12: AI "Generate" functionality (Budget Constraints & Error Handling)

| | |
|---|---|
| **Objective** | To test generation limit constraints and edge-case error handling for strict budgets under demanding Use-cases. |
| **Action** | Input an incredibly restrictive budget of '65000' with the 'Gaming' use-case, and generate. |
| **Expected Result** | The system attempts to satisfy the 'Gaming' constraint (requiring a dedicated GPU). If it cannot physically fit a dedicated GPU within 65k, it prioritizes the use-case and issues a soft "Over Budget" UI warning rather than crashing. |
| **Actual Result** | The engine correctly assembled the absolute cheapest GPU/CPU combo (e.g., RX 6500 XT), finished slightly over budget, and properly rendered the yellow "Over budget" warning banner. |
| **Conclusion** | Test passed. |

### 4.2.13 Test Case 13: AI "Generate" functionality (Brand Preference)

| | |
|---|---|
| **Objective** | To test explicit dropdown filtering limits and Gemini custom text parsing. |
| **Action** | Select "AMD" from the CPU Brand dropdown, and type "Must have WiFi" into the custom preferences box, then Generate via Gemini LLM. |
| **Expected Result** | Generation yields exclusively Ryzen processors alongside Wi-Fi enabled motherboards. |
| **Actual Result** | Returned JSON object featured 100% adherence to the AMD brand limit and selected a Wi-Fi motherboard. |
| **Conclusion** | Test passed. |

### 4.2.14 Test Case 14: AI "Generate" functionality (Usecase Dropdown)

| | |
|---|---|
| **Objective** | To test if the generation algorithm structurally shifts budget allocation based on the standard Use-case dropdown. |
| **Action** | Select the "Gaming" dropdown value and generate a 200k build. Then change dropdown to "AI / ML" and generate again. |
| **Expected Result** | The Gaming build prioritizes maximum GPU budget allocation, whereas the AI/ML build prioritizes high-VRAM NVIDIA units and increased RAM volume. |
| **Actual Result** | The engine accurately shifted component tier weightings logically matching the specific workflow domains. |
| **Conclusion** | Test passed. |

### 4.2.15 Test Case 15: AI "Fill" Functionality

| | |
|---|---|
| **Objective** | To test generation of secondary components surrounding a user's strict selections. |
| **Action** | Lock an RTX 4090 GPU and an Intel i9 in the builder and click "Fill". |
| **Expected Result** | AI picks massive PSUs and proper motherboards WITHOUT altering the locked GPU or CPU. |
| **Actual Result** | Auxiliary components generated successfully while keeping user-selected parts locked. |
| **Conclusion** | Test passed. |

### 4.2.16 Test Case 16: Expert AI Build Review Functionality

| | |
|---|---|
| **Objective** | To evaluate the LLM's capability to analyze structural bottlenecks in existing configurations. |
| **Action** | Trigger the "AI Review" function on a completed PC build containing a mismatched tier CPU/GPU combination. |
| **Expected Result** | A parsed JSON modal opens displaying a numeric rating out of 100, bottleneck analysis, and specific hardware recommendations (strengths/weaknesses). |
| **Actual Result** | The Gemini integration successfully analyzed the configuration and rendered comprehensive critical feedback directly in the UI. |
| **Conclusion** | Test passed. |

### 4.2.17 Test Case 17: Parts Catalog Category Filters

| | |
|---|---|
| **Objective** | To test if structural categories segregate items properly via the frontend UI routing and backend API. |
| **Action** | From the "Browse Parts" page, click the "Storage" category card. |
| **Expected Result** | The application routes to the selected category and the API eliminates all items that lack the specified `type="SSD"` matching. |
| **Actual Result** | The interface successfully masked all unmatched parts, displaying purely Storage drives. |
| **Conclusion** | Test passed. |

### 4.2.18 Test Case 18: Local Category Text Search

| | |
|---|---|
| **Objective** | To check debounced text filtering within specific component categories. |
| **Action** | Navigate inside the "Processors" category and type "Ryzen 7" into the local category search bar. |
| **Expected Result** | The grid dynamically filters out Intel chips and other AMD processors, leaving only relevant Ryzen 7 components within that category. |
| **Actual Result** | Query successfully trimmed the local category list down to exactly the targeted chips. |
| **Conclusion** | Test passed. |

### 4.2.19 Test Case 19: Component Detailed Specs Page

| | |
|---|---|
| **Objective** | To ensure the system correctly fetches and displays the unique hardware specifications for different types of components. |
| **Action** | Click on any Motherboard or CPU from the catalog to open its dedicated Detail View page. |
| **Expected Result** | The frontend should successfully extract the unique specifications specific to that item (e.g., Motherboard Form Factor, Socket type, maximum RAM) and render them cleanly in a table. |
| **Actual Result** | The interface successfully loaded the specific properties from the database and displayed a clean table of hardware specs. |
| **Conclusion** | Test passed. |

### 4.2.20 Test Case 20: Price History Chart

| | |
|---|---|
| **Objective** | To ensure the system correctly fetches historical pricing data and successfully renders it as a line graph. |
| **Action** | On the detail view page of any component (e.g., a Ryzen CPU or a Motherboard), scroll down to view the Historical Price tracking chart. |
| **Expected Result** | The frontend should load the scraped historical price data and draw an accurate line graph showing price changes over time. |
| **Actual Result** | The price history chart loaded successfully, displaying a clear line graph with dates on the X-axis and prices (NPR) on the Y-axis. |
| **Conclusion** | Test passed. |

### 4.2.21 Test Case 21: Save Build function

| | |
|---|---|
| **Objective** | To test if a user can securely save their completed PC combination to the database. |
| **Action** | Click the "Save Build" icon on a finished build, enter a custom name, and submit. |
| **Expected Result** | The build should be saved to the database without errors and appear on the user dashboard. |
| **Actual Result** | The build successfully appeared in the 'Recent Builds' section on the User Dashboard and inside the 'Saved Builds' card. |
| **Conclusion** | Test passed. |

### 4.2.22 Test Case 22: Delete Saved Build

| | |
|---|---|
| **Objective** | To ensure users can successfully delete their saved builds from their account. |
| **Action** | Navigate into the 'Saved Builds' card on the Dashboard, and click the delete icon next to a build. |
| **Expected Result** | The build should be permanently removed from the user's account and disappear from the interface. |
| **Actual Result** | The build was successfully deleted from the Saved Builds library and the UI updated instantly. |
| **Conclusion** | Test passed. |

### 4.2.23 Test Case 23: Load Saved Build into Builder

| | |
|---|---|
| **Objective** | To verify users can reload their previously saved builds back into the generator interface. |
| **Action** | Navigate to the "Saved Builds" card, click "View", and then click "Load into Builder". |
| **Expected Result** | The builder page should open with all the saved component categories pre-filled exactly as they were Saved. |
| **Actual Result** | The system successfully populated the PC Builder row states with the exact parts from the saved array. |
| **Conclusion** | Test passed. |

### 4.2.24 Test Case 24: Build Comparison Feature

| | |
|---|---|
| **Objective** | To test the side-by-side Build Comparison feature and its integrated AI summary. |
| **Action** | On the "Compare" page, select two distinct saved builds using the "Build A" and "Build B" dropdown menus. |
| **Expected Result** | The system should automatically load both builds into a side-by-side comparison table, while simultaneously generating an expert AI summary analyzing the differences. |
| **Actual Result** | The interface successfully populated the hardware comparison table and the Gemini AI provided a detailed performance summary of both configurations. |
| **Conclusion** | Test passed. |

### 4.2.25 Test Case 25: AI Chat Hardware Assistant

| | |
|---|---|
| **Objective** | To test the AI Hardware Assistant's ability to answer conversational hardware questions. |
| **Action** | Type into the chat model: "Which is better for purely video editing: AMD or Intel?" |
| **Expected Result** | The AI assistant should reply with accurate industry advice regarding the specific workload. |
| **Actual Result** | The AI successfully generated a helpful, perfectly formatted response comparing the brands. |
| **Conclusion** | Test passed. |

### 4.2.26 Test Case 26: Global Theme Toggling

| | |
|---|---|
| **Objective** | To ensure the user interface can toggle between Dark and Light color palettes smoothly. |
| **Action** | Click the Light/Dark mode toggle button in the top navigation bar. |
| **Expected Result** | The entire website's colors should instantly switch between light and dark modes. |
| **Actual Result** | The interface successfully switched themes instantly without any text readability loss. |
| **Conclusion** | Test passed. |

### 4.2.27 Test Case 27: Admin Component Creation

| | |
|---|---|
| **Objective** | To verify administrators can add a new component with full specifications, vendor links, and automatic price scraping. |
| **Action** | In the Admin panel, open the "Add Part" modal and fill in the component Name, Brand, Type, Image URL, hardware specifications (e.g., Socket, Cores, TDP for a CPU), and at least one Vendor URL (Hukut/BigByte/PCMOD Nepal), then click "Add Part". |
| **Expected Result** | The part should be saved to the database. The system should immediately trigger an automatic scrape using the provided vendor URL, fetching the live price and overriding any placeholder price entered. |
| **Actual Result** | The new component was successfully saved with all specifications, and the backend scraper automatically retrieved and applied the live vendor price to the newly created entry. |
| **Conclusion** | Test passed. |

### 4.2.28 Test Case 28: Admin Part Metadata Editing

| | |
|---|---|
| **Objective** | To verify administrators can safely edit a component's specifications via the Admin Parts panel. |
| **Action** | In the Admin Parts page, click the edit (pencil) icon on an existing Motherboard, change a specification field (e.g., chipset or max RAM), and save the changes. |
| **Expected Result** | The updated specification should be saved to the database, and the part's detail page should reflect the new value immediately. |
| **Actual Result** | The component specification was successfully updated and reflected correctly across the user-facing catalog. |
| **Conclusion** | Test passed. |

### 4.2.29 Test Case 29: Admin Part Deletion

| | |
|---|---|
| **Objective** | To verify administrators can permanently delete a component from the database. |
| **Action** | In the Admin Parts page, click the Delete (trash bin) icon on an existing component and confirm the warning dialog. |
| **Expected Result** | The component should be removed from the database, cascading deletes ensuring no orphaned relational data remains, and the UI list should instantly reflect the removal. |
| **Actual Result** | The deletion executed successfully, completely removing the component and safely triggering the necessary cascading checks. |
| **Conclusion** | Test passed. |

### 4.2.30 Test Case 30: Admin User Role Management

| | |
|---|---|
| **Objective** | To verify administrators can promote standard users to admin status and demote them back. |
| **Action** | In the Admin Users page, locate a standard user row and click the "Promote" button. Verify the role badge changes to "admin". Click the "Demote" button and verify it reverts to standard user. |
| **Expected Result** | The user's role should update in the database, and the UI should instantly reflect the new role badge without a page reload. |
| **Actual Result** | Both promotion and demotion actions executed successfully with real-time UI updates. |
| **Conclusion** | Test passed. |

### 4.2.31 Test Case 31: Admin User Status Management

| | |
|---|---|
| **Objective** | To verify administrators can temporarily suspend user accounts by toggling their active status. |
| **Action** | In the Admin Users page, click the Deactivate icon on an active user and confirm. Verify the status badge changes from green "Active" to grey "Inactive". Click Reactivate and confirm the change is reversed. |
| **Expected Result** | The user's active status should toggle in the database, and the UI badge should change colors dynamically upon confirmation. |
| **Actual Result** | Deactivation and reactivation worked flawlessly, instantly locking/unlocking the account in the system. |
| **Conclusion** | Test passed. |

### 4.2.32 Test Case 32: Admin User Deletion

| | |
|---|---|
| **Objective** | To verify administrators can permanently delete a user account from the system. |
| **Action** | In the Admin Users page, click the Delete icon (trash bin) for a test user account. Confirm the warning prompt in the dialog. |
| **Expected Result** | The user's record should be permanently removed from the PostgreSQL database, and their row should instantly disappear from the management table. |
| **Actual Result** | Deletion was successful, confirming complete removal from both the UI and database. |
| **Conclusion** | Test passed. |

### 4.2.33 Test Case 33: Admin Vendor Activation Toggle

| | |
|---|---|
| **Objective** | To verify administrators can enable or disable external vendor sources for scraping. |
| **Action** | In the Admin Vendors page, locate an active vendor and click the "Deactivate" toggle. Verify the green "Active" badge changes to grey "Inactive". Re-click to activate it. |
| **Expected Result** | Setting a vendor to inactive should immediately update the database and UI, communicating vendor status across the ecosystem. |
| **Actual Result** | The vendor toggle updated successfully, allowing admins smooth control over vendor availability. |
| **Conclusion** | Test passed. |

### 4.2.34 Test Case 34: Admin Dashboard Statistics

| | |
|---|---|
| **Objective** | To verify the Admin dashboard correctly fetches and displays live system-wide statistics from the backend. |
| **Action** | Log in as an Admin and navigate to the Admin Dashboard page. |
| **Expected Result** | Four statistic cards should display accurate live counts: Total Parts, Registered Users, Active Vendors, and Saved Builds. |
| **Actual Result** | All four statistics cards loaded correctly with live counts drawn from the backend PostgreSQL database. |
| **Conclusion** | Test passed. |

### 4.2.35 Test Case 35: Manual Force Price Sync via Admin Parts

| | |
|---|---|
| **Objective** | To verify administrators can manually trigger a live price refresh on a specific component using the Force Scrape function. |
| **Action** | In the Admin Parts panel, open the edit modal for an existing component that has vendor URLs configured, and click the "Force Scrape" button inside the modal. |
| **Expected Result** | The backend should dispatch a scrape request to retrieve the live price. A success message should appear, and a new data point stamp should be added to the component's price history graph as proof of the update, even if the price remained identical. |
| **Actual Result** | The Force Scrape button successfully triggered a real-time scrape. The component's price history graph successfully registered a new timestamped data point, serving as proof of the live sync. |
| **Conclusion** | Test passed. |

### 4.2.36 Test Case 36: Scraper Error Resistance

| | |
|---|---|
| **Objective** | To verify the background scraper handles dead or invalid vendor URLs gracefully without crashing the Django server. |
| **Action** | In the Admin Parts panel, attempt to manually "Force Scrape" a component that has an old, expired, or invalid vendor product URL (e.g., a 404 page). |
| **Expected Result** | The scraping thread should handle the failure cleanly, logging the 404 error to the terminal, marking the item as out of stock, and the Django server should not crash. |
| **Actual Result** | The Django terminal successfully logged the scrape failure ("Forcing out of stock"), safely overriding the stock status without interrupting server operations. |
| **Conclusion** | Test passed. |

### 4.2.37 Test Case 37: Retrain Machine Learning Pipeline

| | |
|---|---|
| **Objective** | To verify administrators can retrain the internal ML recommendation engine from the Admin Dashboard. |
| **Action** | On the Admin Dashboard, scroll to the "System Actions" section and click the "Retrain Now" button. |
| **Expected Result** | The button should show a "Running..." loading state, and once complete, a confirmation message should appear below the button. A new Scikit-Learn model file (.joblib) should be saved on the server. |
| **Actual Result** | The "Retrain Now" button triggered the ML training pipeline, displayed a loading state, and showed a success confirmation message after completion. |
| **Conclusion** | Test passed. |

### 4.2.38 Test Case 38: Machine Learning Build Generation (Non-LLM)

| | |
|---|---|
| **Objective** | To test the platform's ability to generate a full PC build using the offline Scikit-Learn ML pipeline (without using the Gemini API). |
| **Action** | In the PC Builder, enter a budget and use-case, then click "Generate". In the generation method modal, select the "ML Engine" option (non-Gemini). |
| **Expected Result** | A complete PC build should be generated and populated into the Builder rows entirely by the internal K-Nearest Neighbors ML model, with no call made to the Gemini API. |
| **Actual Result** | The ML engine successfully generated a full 8-part build configuration within the specified budget without requiring an internet connection to the Gemini service. |
| **Conclusion** | Test passed. |

---

## 4.3 SYSTEM TESTING (END-TO-END)

### 4.3.1 System Test 1: Complete User Lifecycle (End-to-End)

| | |
|---|---|
| **Objective** | To validate the entire standard user journey from account creation to saving a generated PC build. |
| **Action** | Register a new account -> Navigate to PC Builder -> Generate a Rs.250,000 build -> Save the build with a custom name -> Verify the build appears in the Dashboard Recent Builds and Saved Builds sections. |
| **Expected Result** | Every step of the user journey should pass without errors, and the final saved build should persist correctly in the database and appear in the user's dashboard. |
| **Actual Result** | The full user journey completed flawlessly. The generated build was saved and appeared correctly in both the "Recent Builds" list and the "Saved Builds" card on the dashboard. |
| **Conclusion** | Test passed. |

### 4.3.2 System Test 2: LLM Generation Error Handling

| | |
|---|---|
| **Objective** | To validate the system handles Gemini LLM API failures gracefully without crashing the application. |
| **Action** | Attempt to trigger a Gemini LLM generation while the server has no internet access (e.g., with the network disabled or an invalid API key). |
| **Expected Result** | The frontend should receive a clean, descriptive error message from the backend instead of a white screen or a raw server crash. The user should be notified that the generation failed and can retry. |
| **Actual Result** | The backend caught the LLM API exception and returned a structured error response. The frontend displayed a clear "Generation failed" alert message to the user with no application crash. |
| **Conclusion** | Test passed. |

### 4.3.3 System Test 3: Administrator Full Data Pipeline

| | |
|---|---|
| **Objective** | To validate the complete administrator data maintenance pipeline, from adding a new component to retraining the AI model. |
| **Action** | Step 1: Add a new CPU part with vendor URLs via the "Add Part" modal in Admin Parts. Step 2: Confirm the background scraper fires and the live price is applied automatically. Step 3: Navigate to the Admin Dashboard and click "Retrain Now" to rebuild the ML model with the new component included. |
| **Expected Result** | The new component should pass through all three stages: database creation, live price scraping, and ML model inclusion — all controlled from the Admin panel UI. |
| **Actual Result** | The new CPU was saved, the backend scraper immediately fetched its live price, and the ML model successfully retrained to include the new component in future AI recommendations. |
| **Conclusion** | Test passed. |

### 4.3.4 System Test 4: Authorization & Security Enforcement

| | |
|---|---|
| **Objective** | To validate that the system correctly enforces role-based access control, preventing standard users from accessing administrator-only endpoints and unauthenticated visitors from accessing protected user resources. |
| **Action** | Step 1: Log in as a standard (non-admin) user and attempt to directly navigate to `/admin` and `/admin/parts` via the browser URL bar. Step 2: Log out entirely, then attempt to navigate to `/dashboard` and `/my-builds` as an unauthenticated visitor. |
| **Expected Result** | In Step 1, the system should block access and redirect the standard user away from admin pages with no data leakage. In Step 2, the unauthenticated visitor should be redirected to the Login page with no access to protected user data. |
| **Actual Result** | The AdminRoute wrapper correctly blocked the non-admin user and redirected them. The ProtectedRoute wrapper correctly detected missing authentication tokens and redirected the visitor to the login page. No protected data was exposed in either scenario. |
| **Conclusion** | Test passed. |

### 4.3.5 System Test 5: Build Comparison & AI Analysis Pipeline

| | |
|---|---|
| **Objective** | To validate the complete build comparison flow from saving two distinct builds to receiving an AI-powered side-by-side analysis. |
| **Action** | Step 1: Generate and save a Rs.150,000 Gaming build. Step 2: Generate and save a Rs.300,000 Video Editing build. Step 3: Navigate to the Compare page, select both builds, and trigger the AI comparison analysis. |
| **Expected Result** | Both builds should appear in the comparison selector. Upon comparing, the system should display a side-by-side component breakdown and the LLM should return a structured analysis highlighting the performance differences between the two builds. |
| **Actual Result** | Both saved builds loaded correctly in the comparison dropdown. The side-by-side table rendered all component differences accurately, and the Gemini LLM returned a comprehensive comparison analysis highlighting the GPU and RAM differences between the gaming and editing configurations. |
| **Conclusion** | Test passed. |

---

*End of Chapter 4 — Testing and Analysis. Total: 38 Unit Tests, 5 System Tests.*
